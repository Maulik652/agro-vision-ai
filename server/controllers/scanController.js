import {
  SCAN_MODULE_KEYS,
  generateCropDoctorAdvice,
  generateScanDashboard,
  generateScanModule,
  listScanHistory,
  saveScanHistory,
  sanitizeScanInput
} from "../services/scanService.js";

const moduleMap = {
  crop: "crop",
  disease: "disease",
  pest: "pest",
  nutrient: "nutrient",
  "health-score": "health-score"
};

const escapePdfText = (value) =>
  String(value)
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const buildScanPdfBuffer = ({ farmerName, dashboard }) => {
  const modules = dashboard?.modules || {};
  const summary = dashboard?.summary || {};
  const advanced = dashboard?.advancedInsights || {};

  const lines = [
    "AgroVision AI - Crop Scan Report",
    `Farmer: ${farmerName || "Farmer"}`,
    `Generated: ${new Date(summary.generatedAt || Date.now()).toLocaleString("en-IN")}`,
    "",
    `AI Detection Accuracy: ${summary.detectionAccuracy ?? "N/A"}%`,
    `Crop Health Score: ${summary.healthScore ?? "N/A"}/100`,
    `Farm Health Status: ${summary.farmHealthStatus ?? advanced?.farmHealthStatus?.label ?? "N/A"}`,
    `Prediction Quality Score: ${summary.qualityScore ?? "N/A"}/100`,
    `Re-scan Recommended: ${summary.requiresRescan ? "Yes" : "No"}`,
    `Scans Completed: ${summary.scansCompleted ?? 25000}+`,
    `Farmers Helped: ${summary.farmersHelped ?? 4200}+`,
    "",
    `Crop: ${modules.crop?.crop?.name || "N/A"} (${modules.crop?.crop?.confidence || "N/A"}%)`,
    `Disease: ${modules.disease?.disease?.name || "N/A"}`,
    `Disease Severity: ${modules.disease?.disease?.severity || "N/A"}`,
    `Pest: ${modules.pest?.pest?.name || "N/A"}`,
    `Pest Damage: ${modules.pest?.pest?.damageLevel || "N/A"}`,
    `Nutrient Deficiency: ${modules.nutrient?.nutrient?.name || "N/A"}`,
    `Nutrient Severity: ${modules.nutrient?.nutrient?.severity || "N/A"}`,
    `Future Disease Spread Risk: ${advanced?.futureRisk?.diseaseSpreadRisk || "N/A"}`,
    `Future Pest Spread Risk: ${advanced?.futureRisk?.pestSpreadRisk || "N/A"}`,
    `Weather Impact Risk: ${advanced?.futureRisk?.weatherRiskImpact || "N/A"}`,
    `Satellite NDVI Score: ${advanced?.satelliteInsight?.ndviScore ?? "N/A"}`,
    `Location Alert: ${advanced?.locationAlert?.location || "N/A"}`,
    "",
    "Recommended Actions:"
  ];

  const actions = Array.isArray(modules.treatment?.actions) ? modules.treatment.actions : [];

  actions.forEach((action, index) => {
    lines.push(`${index + 1}. ${action.treatment} - ${action.timing}`);
    lines.push(`   Prevention: ${action.prevention}`);
  });

  const content = ["BT", "/F1 12 Tf", "40 790 Td"];

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

const runSingleModule = (moduleKey) => async (req, res) => {
  try {
    const payload = sanitizeScanInput(req.body || {});
    const moduleResult = await generateScanModule(moduleKey, payload);

    return res.status(200).json({
      success: true,
      module: moduleKey,
      result: moduleResult
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to process scan module",
      detail: error.message
    });
  }
};

export const scanAnalyze = async (req, res) => {
  try {
    const payload = sanitizeScanInput({
      ...(req.body || {}),
      userContext: {
        city: req.user?.city,
        state: req.user?.state,
        farmerName: req.user?.name
      }
    });

    if (!payload.imageBase64) {
      return res.status(400).json({
        success: false,
        message: "imageBase64 is required"
      });
    }

    const dashboard = await generateScanDashboard(payload);
    let history = [];

    try {
      await saveScanHistory({
        userId: req.user?._id,
        input: dashboard.input,
        modules: dashboard.modules,
        summary: dashboard.summary,
        advancedInsights: dashboard.advancedInsights
      });

      history = await listScanHistory(req.user?._id, 8);
    } catch {
      history = [];
    }

    return res.status(200).json({
      success: true,
      ...dashboard,
      history
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to analyze crop scan",
      detail: error.message
    });
  }
};

export const scanReport = async (req, res) => {
  try {
    const payload = sanitizeScanInput({
      ...(req.body || {}),
      userContext: {
        city: req.user?.city,
        state: req.user?.state,
        farmerName: req.user?.name
      }
    });

    const dashboard = req.body?.modules && req.body?.summary
      ? {
        modules: req.body.modules,
        summary: req.body.summary,
        advancedInsights: req.body.advancedInsights || {},
        input: payload
      }
      : await generateScanDashboard(payload);

    const pdf = buildScanPdfBuffer({
      farmerName: req.user?.name || "Farmer",
      dashboard
    });

    const fileName = `ai-crop-scan-report-${Date.now()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", String(pdf.length));

    return res.status(200).send(pdf);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to export crop scan report",
      detail: error.message
    });
  }
};

export const scanCrop = runSingleModule("crop");
export const scanDisease = runSingleModule("disease");
export const scanPest = runSingleModule("pest");
export const scanNutrient = runSingleModule("nutrient");
export const scanHealthScore = runSingleModule("health-score");

export const scanHistory = async (req, res) => {
  try {
    const history = await listScanHistory(req.user?._id, 12);

    return res.status(200).json({
      success: true,
      history
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to fetch scan history",
      detail: error.message
    });
  }
};

export const scanCropDoctor = async (req, res) => {
  try {
    const question = String(req.body?.question || "").trim();

    if (!question) {
      return res.status(400).json({
        success: false,
        message: "question is required"
      });
    }

    const payload = sanitizeScanInput({
      ...(req.body || {}),
      userContext: {
        city: req.user?.city,
        state: req.user?.state,
        farmerName: req.user?.name
      }
    });

    let scanData = {
      modules: req.body?.modules || {},
      summary: req.body?.summary || {}
    };

    if (Object.keys(scanData.modules).length === 0 && payload.imageBase64) {
      scanData = await generateScanDashboard(payload);
    }

    if (Object.keys(scanData.modules).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Scan context required. Run scan first or provide imageBase64."
      });
    }

    const advice = generateCropDoctorAdvice({
      question,
      scanData,
      input: payload
    });

    return res.status(200).json({
      success: true,
      ...advice
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to generate crop doctor advice",
      detail: error.message
    });
  }
};

export const scanModules = (req, res) => {
  return res.status(200).json({
    success: true,
    modules: SCAN_MODULE_KEYS,
    routeMap: moduleMap
  });
};
