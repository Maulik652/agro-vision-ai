import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import ScanHistory from "../models/ScanHistory.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

/* ── Configuration ─────────────────────────────────────────────────────────── */
const PYTHON_EXECUTABLE = process.env.PYTHON_EXECUTABLE || "python";
const AI_SERVICE_DIR    = path.resolve(__dirname, "..", "..", "ai_service");
const CROP_SCAN_CLI     = path.join(AI_SERVICE_DIR, "crop_scan_cli.py");

/** Optional FastAPI microservice URL.  Set CROP_SCAN_API_URL env var to enable. */
const FASTAPI_URL = (process.env.CROP_SCAN_API_URL || "").trim();

/* ── Multer: in-memory storage, max 10 MB, JPG/PNG only ─────────────────────── */
const _multerInstance = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png"];
    if (allowed.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(Object.assign(new Error("Only JPG and PNG images are accepted"), { status: 400 }));
    }
  },
});

/**
 * Export the multer single-file middleware for use in the route definition.
 * Field name must be "image" on the FormData sent by the frontend.
 */
export const uploadMiddleware = _multerInstance.single("image");

/* ── Helpers ────────────────────────────────────────────────────────────────── */
const clamp = (v, lo, hi) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;
};

const normalizeResult = (raw) => ({
  disease:     String(raw.disease     || "Unknown Disease").trim(),
  confidence:  clamp(raw.confidence,   0, 1),
  severity:    clamp(raw.severity,     0, 100),
  healthScore: clamp(raw.healthScore,  0, 100),
  predictions: Array.isArray(raw.predictions)
    ? raw.predictions.slice(0, 3).map((p) => ({
        disease:    String(p.disease    || "Unknown"),
        confidence: clamp(p.confidence, 0, 1),
      }))
    : [],
  treatment:  Array.isArray(raw.treatment)  ? raw.treatment  : [],
  prevention: Array.isArray(raw.prevention) ? raw.prevention : [],
});

/* ── FastAPI call (optional, requires CROP_SCAN_API_URL env var) ────────────── */
const callFastAPI = async (imageBuffer, mimeType, cropType) => {
  if (!FASTAPI_URL || typeof globalThis.fetch !== "function") return null;

  try {
    const body = new FormData();
    body.append("image",    new Blob([imageBuffer], { type: mimeType }), "image.jpg");
    body.append("cropType", cropType);

    const res = await globalThis.fetch(FASTAPI_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
};

/* ── Python CLI fallback ─────────────────────────────────────────────────────── */
const callPythonCLI = (imageBuffer, mimeType, cropType) =>
  new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      imageBase64: imageBuffer.toString("base64"),
      mimeType,
      cropType,
    });

    const child = spawn(PYTHON_EXECUTABLE, [CROP_SCAN_CLI], {
      cwd:   AI_SERVICE_DIR,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

    child.on("close", (code) => {
      if (code !== 0) {
        try {
          const parsed = JSON.parse(stdout.trim());
          if (parsed.error === "NOT_A_CROP_IMAGE") {
            const err = new Error("NOT_A_CROP_IMAGE");
            err.isNotCropImage = true;
            return reject(err);
          }
        } catch { /* ignore parse error, fall through */ }
        return reject(new Error(`Python CLI exited ${code}: ${stderr.slice(0, 400)}`));
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        if (parsed.error === "NOT_A_CROP_IMAGE") {
          const err = new Error("NOT_A_CROP_IMAGE");
          err.isNotCropImage = true;
          return reject(err);
        }
        if (parsed.error) return reject(new Error(parsed.error));
        resolve(parsed);
      } catch {
        reject(new Error("Failed to parse Python CLI JSON output"));
      }
    });

    child.on("error", reject);

    child.stdin.write(payload);
    child.stdin.end();
  });

/* ── Main controller ─────────────────────────────────────────────────────────── */

/**
 * POST /api/ai/crop-scan
 * Accepts: multipart/form-data { image: File, cropType: string }
 * Returns: disease prediction JSON as specified in the API contract
 */
export const aiCropScan = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image file is required" });
    }

    const cropType    = String(req.body?.cropType || "tomato").toLowerCase().trim() || "tomato";
    const mimeType    = (req.file.mimetype || "image/jpeg").toLowerCase();
    const imageBuffer = req.file.buffer;

    /* Attempt FastAPI → CLI */
    let rawResult = await callFastAPI(imageBuffer, mimeType, cropType);

    if (!rawResult) {
      try {
        rawResult = await callPythonCLI(imageBuffer, mimeType, cropType);
      } catch (cliError) {
        // Non-crop image — return 422 with clear message, no fallback
        if (cliError.isNotCropImage) {
          return res.status(422).json({
            error: "NOT_A_CROP_IMAGE",
            message: "This doesn't look like a crop image. Please upload a clear photo of a plant leaf or crop field.",
          });
        }
        console.error("cropScan CLI error:", cliError.message);
        return res.status(503).json({ message: "AI scan service temporarily unavailable. Please try again." });
      }
    }

    const result = normalizeResult(rawResult);

    /* Persist to ScanHistory — non-critical, do not fail the request */
    ScanHistory.create({
      farmerId:        req.user._id,
      cropType,
      detectedDisease: result.disease,
      confidence:      result.confidence,
      severity:        result.severity,
      healthScore:     result.healthScore,
      predictions:     result.predictions,
      treatment:       result.treatment,
      prevention:      result.prevention,
      imageUrl:        null,
      date:            new Date(),
    }).catch((err) => console.error("ScanHistory save error:", err.message));

    return res.status(200).json(result);
  } catch (error) {
    console.error("aiCropScan handler error:", error.message);
    return res.status(500).json({ message: "AI scan service temporarily unavailable" });
  }
};

/* ── Scan history endpoint ───────────────────────────────────────────────────── */

/**
 * GET /api/ai/scan-history
 * Returns the authenticated farmer's recent scan records (newest first, max 20).
 */
export const aiScanHistory = async (req, res) => {
  try {
    const records = await ScanHistory.find({ farmerId: req.user._id })
      .sort({ date: -1 })
      .limit(20)
      .select("cropType detectedDisease confidence severity healthScore date -_id")
      .lean();

    const history = records.map((r) => ({
      date:       r.date,
      crop:       r.cropType,
      disease:    r.detectedDisease,
      confidence: Math.round(r.confidence * 100),
      severity:   r.severity,
      healthScore: r.healthScore,
    }));

    return res.status(200).json({ history });
  } catch (error) {
    console.error("aiScanHistory error:", error.message);
    return res.status(500).json({ message: "Failed to load scan history" });
  }
};
