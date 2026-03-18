import multer from "multer";
import ScanHistory from "../models/ScanHistory.js";

/* ── Configuration ─────────────────────────────────────────────────────────── */
/** FastAPI microservice URL */
const FASTAPI_URL = (process.env.CROP_SCAN_API_URL || "http://127.0.0.1:8001").trim();

/* ── Multer: in-memory storage, max 5 MB, JPG/PNG only ─────────────────────── */
const _multerInstance = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 },
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

/* ── FastAPI call ────────────────────────────────────────────────────────────── */
const callFastAPI = async (imageBuffer, mimeType, cropType, scanType = "auto") => {
  const body = new FormData();
  body.append("image",    new Blob([imageBuffer], { type: mimeType }), "image.jpg");
  body.append("cropType", cropType);
  body.append("scanType", scanType);

  const res = await globalThis.fetch(`${FASTAPI_URL}/predict`, {
    method: "POST",
    body,
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`Crop scan service returned ${res.status}`);
  }

  return res.json();
};

/* ── Main controller ─────────────────────────────────────────────────────────── */

/**
 * POST /api/ai/crop-scan
 * Accepts: multipart/form-data { image: File, cropType: string, scanType: string }
 * Returns: { success: boolean, message: string, data: prediction | null }
 */
export const aiCropScan = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image file is required.",
        data: null,
      });
    }

    // ── Re-validate MIME type on the server (security layer) ──────────────────
    const allowedMimes = ["image/jpeg", "image/jpg", "image/png"];
    const mimeType = (req.file.mimetype || "").toLowerCase();
    if (!allowedMimes.includes(mimeType)) {
      return res.status(400).json({
        success: false,
        message: "Only JPG and PNG images are accepted.",
        data: null,
      });
    }

    // ── File size guard (belt-and-suspenders beyond multer) ───────────────────
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: "File size must be less than 5MB.",
        data: null,
      });
    }

    const cropType    = String(req.body?.cropType || "tomato").toLowerCase().trim() || "tomato";
    const scanType    = String(req.body?.scanType || "auto").toLowerCase().trim();
    const imageBuffer = req.file.buffer;

    let rawResult;
    try {
      rawResult = await callFastAPI(imageBuffer, mimeType, cropType, scanType);
    } catch (apiError) {
      if (apiError.isNotCropImage) {
        return res.status(422).json({
          success: false,
          error: "NOT_A_CROP_IMAGE",
          message: "Invalid image. Please upload a crop/plant image.",
          data: null,
        });
      }
      if (apiError.isBlurry) {
        return res.status(422).json({
          success: false,
          error: "BLURRY_IMAGE",
          message: "Image is too blurry. Upload a clear image.",
          data: null,
        });
      }
      if (apiError.isInvalidScanType) {
        return res.status(422).json({
          success: false,
          error: "INVALID_SCAN_TYPE",
          message: apiError.message || "Image does not match the selected scan type.",
          data: null,
        });
      }
      console.error("cropScan API error:", apiError.message);
      return res.status(503).json({
        success: false,
        message: "AI scan service temporarily unavailable. Please try again.",
        data: null,
      });
    }

    const result = normalizeResult(rawResult);

    // ── Confidence threshold check (< 60% = unclear image) ───────────────────
    if (result.confidence < 0.60) {
      return res.status(422).json({
        success: false,
        error: "LOW_CONFIDENCE",
        message: "Unclear image. Please upload a better quality image.",
        data: null,
      });
    }

    /* Persist to ScanHistory — non-critical */
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

    return res.status(200).json({
      success: true,
      message: "Scan completed successfully.",
      data: result,
    });

  } catch (error) {
    console.error("aiCropScan handler error:", error.message);
    return res.status(500).json({
      success: false,
      message: "AI scan service temporarily unavailable.",
      data: null,
    });
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
