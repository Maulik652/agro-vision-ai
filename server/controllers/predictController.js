import {
  generateAllPredictions,
  generatePrediction,
  getPredictionModuleKeys
} from "../services/predictionService.js";

const moduleByPath = {
  "crop-health-risk": "crop-health-risk",
  yield: "yield",
  irrigation: "irrigation",
  pest: "pest",
  market: "market",
  profit: "profit",
  crop: "crop",
  weather: "weather",
  "farm-health": "farm-health",
  "climate-risk": "climate-risk"
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeBody = (body = {}) => {
  const input = {
    farmLocation: String(body.farmLocation || "").trim(),
    cropType: String(body.cropType || "").trim(),
    farmSizeAcres: Number(body.farmSizeAcres),
    soilType: String(body.soilType || "").trim(),
    sowingDate: String(body.sowingDate || "").trim(),
    irrigationMethod: String(body.irrigationMethod || "").trim(),
    expectedHarvestDate: String(body.expectedHarvestDate || "").trim(),
    temperature: Number(body.temperature),
    rainfall: Number(body.rainfall),
    humidity: Number(body.humidity),
    soilMoisture: Number(body.soilMoisture)
  };

  if (!Number.isFinite(input.farmSizeAcres) || input.farmSizeAcres <= 0) {
    input.farmSizeAcres = 2;
  }

  if (!Number.isFinite(input.temperature)) {
    input.temperature = 28;
  }

  if (!Number.isFinite(input.rainfall)) {
    input.rainfall = 90;
  }

  if (!Number.isFinite(input.humidity)) {
    input.humidity = 65;
  }

  if (!Number.isFinite(input.soilMoisture)) {
    input.soilMoisture = 55;
  }

  input.temperature = clamp(input.temperature, -10, 60);
  input.rainfall = clamp(input.rainfall, 0, 500);
  input.humidity = clamp(input.humidity, 0, 100);
  input.soilMoisture = clamp(input.soilMoisture, 0, 100);

  return input;
};

const runSingleModule = (moduleKey) => async (req, res) => {
  try {
    const payload = normalizeBody(req.body);
    const prediction = await generatePrediction(moduleKey, payload);

    return res.status(200).json({
      success: true,
      module: moduleKey,
      prediction
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to generate prediction",
      detail: error.message
    });
  }
};

const escapePdfText = (value) =>
  String(value)
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const buildPredictionPdfBuffer = ({ farmerName, farmData, summary, predictions }) => {
  const formatDate = (value) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "N/A";
    }

    return date.toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const lines = [
    "AgroVision AI - Farm Intelligence Prediction Report",
    `Farmer: ${farmerName || "Farmer"}`,
    `Generated: ${formatDate(summary?.generatedAt || new Date().toISOString())}`,
    "",
    `Location: ${farmData?.farmLocation || "N/A"}`,
    `Crop: ${farmData?.cropType || "N/A"}`,
    `Farm Size: ${farmData?.farmSizeAcres || "N/A"} acres`,
    `Soil Type: ${farmData?.soilType || "N/A"}`,
    "",
    `AI Prediction Accuracy: ${summary?.accuracy ?? "N/A"}%`,
    `Predictions Generated: ${summary?.generatedCount ?? 18000}+`,
    `Farmers Supported: ${summary?.farmersSupported ?? 3500}+`,
    `Engine Mode: ${summary?.engineMode || "hybrid"}`,
    ""
  ];

  const modules = Object.values(predictions || {});

  modules.forEach((module) => {
    lines.push(module.title || "Prediction Module");
    lines.push(`Result: ${module.result?.label || "Result"} - ${module.result?.value || "N/A"}`);
    lines.push(`Confidence: ${module.confidence ?? "N/A"}% (${module.confidenceBand || "N/A"})`);
    lines.push(`Recommendation: ${module.recommendation || "N/A"}`);
    lines.push(`Explanation: ${module.explanation || "N/A"}`);

    const metrics = Array.isArray(module.metrics) ? module.metrics.slice(0, 3) : [];
    metrics.forEach((metric) => {
      lines.push(`${metric.label}: ${metric.value}`);
    });

    lines.push("");
  });

  const content = [];
  content.push("BT");
  content.push("/F1 13 Tf");
  content.push("40 780 Td");

  for (const line of lines) {
    content.push(`(${escapePdfText(line)}) Tj`);
    content.push("0 -14 Td");
  }

  content.push("ET");

  const contentStream = content.join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(contentStream, "utf8")} >>\nstream\n${contentStream}\nendstream`
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefStart = Buffer.byteLength(pdf, "utf8");

  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "binary");
};

export const predictAllModules = async (req, res) => {
  try {
    const payload = normalizeBody(req.body);
    const result = await generateAllPredictions(payload);

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to generate AI predictions",
      detail: error.message
    });
  }
};

export const exportPredictionReport = async (req, res) => {
  try {
    const farmData = normalizeBody(req.body?.farmData || req.body || {});

    let predictions = req.body?.predictions;
    let summary = req.body?.summary;

    if (!predictions || typeof predictions !== "object") {
      const generated = await generateAllPredictions(farmData);
      predictions = generated.predictions;
      summary = generated.summary;
    }

    const pdf = buildPredictionPdfBuffer({
      farmerName: req.user?.name || "Farmer",
      farmData,
      summary,
      predictions
    });

    const fileName = `ai-prediction-report-${Date.now()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", String(pdf.length));

    return res.status(200).send(pdf);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to export prediction report",
      detail: error.message
    });
  }
};

export const predictCropHealthRisk = runSingleModule("crop-health-risk");
export const predictYield = runSingleModule("yield");
export const predictIrrigation = runSingleModule("irrigation");
export const predictPest = runSingleModule("pest");
export const predictMarket = runSingleModule("market");
export const predictProfit = runSingleModule("profit");
export const predictCropRecommendation = runSingleModule("crop");
export const predictWeatherRisk = runSingleModule("weather");
export const predictFarmHealth = runSingleModule("farm-health");
export const predictClimateRisk = runSingleModule("climate-risk");

export const listPredictionModules = (req, res) => {
  return res.status(200).json({
    modules: getPredictionModuleKeys(),
    version: "v1"
  });
};

export const predictionRouteMap = moduleByPath;
