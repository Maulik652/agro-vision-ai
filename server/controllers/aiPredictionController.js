import { generatePrediction } from "../services/predictionService.js";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const extractNumber = (text, fallback = 0) => {
  const match = String(text || "").match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return fallback;
  }

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseResultParts = (text) =>
  String(text || "")
    .split("|")
    .map((part) => String(part || "").trim())
    .filter(Boolean);

const pickActiveCrop = (req) =>
  String(req.body?.cropType || req.body?.crop || req.user?.crops || "Wheat")
    .split(",")[0]
    .trim() || "Wheat";

const buildPredictPayload = (req) => {
  const body = req.body || {};
  const weatherData = body.weatherData || {};
  const soilNutrients = body.soilNutrients || {};

  const humidity = toNumber(
    weatherData.humidity ?? body.humidity,
    65
  );

  const rainProbability = toNumber(
    weatherData.rainProbability ?? body.rainProbability,
    35
  );

  return {
    farmLocation: String(body.farmLocation || `${req.user?.city || "Nashik"}, ${req.user?.state || "Maharashtra"}`),
    cropType: pickActiveCrop(req),
    farmSizeAcres: toNumber(body.farmSize ?? body.farmSizeAcres, toNumber(req.user?.farmSize, 2)),
    soilType: String(body.soilType || "Loamy"),
    irrigationMethod: String(body.irrigationMethod || "Drip"),
    temperature: toNumber(weatherData.temperature ?? body.temperature, 28),
    rainfall: toNumber(weatherData.rainfall ?? body.rainfall, rainProbability * 1.5),
    humidity,
    soilMoisture: toNumber(body.soilMoisture ?? body.soilData?.moisture, 55),
    soilNutrients: {
      nitrogen: toNumber(soilNutrients.nitrogen, 40),
      phosphorus: toNumber(soilNutrients.phosphorus, 22),
      potassium: toNumber(soilNutrients.potassium, 30)
    }
  };
};

export const aiYieldPrediction = async (req, res) => {
  try {
    const payload = buildPredictPayload(req);
    const prediction = await generatePrediction("yield", payload);

    const expectedYield = extractNumber(prediction?.result?.value, 4.2);
    const history = Array.isArray(prediction?.chart?.data)
      ? prediction.chart.data.slice(0, 8).map((point, index) => ({
          week: point?.label || `W-${index + 1}`,
          value: toNumber(point?.value, expectedYield)
        }))
      : [];

    const unit = String(prediction?.result?.value || "").toLowerCase().includes("hectare")
      ? "tons/hectare"
      : "tons/acre";

    return res.status(200).json({
      expectedYield: Number(expectedYield.toFixed(2)),
      unit,
      confidence: clamp(toNumber(prediction?.confidence, 80), 0, 100),
      previousSeasonYield: Number((expectedYield * 0.9).toFixed(2)),
      history: history.length ? history : undefined,
      recommendation: prediction?.recommendation || "Use split nutrient doses and adaptive irrigation.",
      engine: prediction?.engine || "python"
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to generate yield prediction",
      detail: error.message
    });
  }
};

export const aiPestRisk = async (req, res) => {
  try {
    const payload = buildPredictPayload(req);
    const prediction = await generatePrediction("pest", payload);

    const parts = parseResultParts(prediction?.result?.value);
    const riskLevel = parts[0] || "Medium";
    const pest = parts[1] || "Aphids";

    const recommendation = String(prediction?.recommendation || "").trim();

    return res.status(200).json({
      risks: [
        {
          crop: payload.cropType,
          risk: pest,
          riskLevel,
          confidence: clamp(toNumber(prediction?.confidence, 70), 0, 100),
          actions: recommendation ? [recommendation] : ["Start field scouting", "Apply preventive neem spray"]
        }
      ],
      recommendation,
      engine: prediction?.engine || "python"
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to generate pest risk prediction",
      detail: error.message
    });
  }
};

export const aiIrrigationRecommendation = async (req, res) => {
  try {
    const payload = buildPredictPayload(req);
    const prediction = await generatePrediction("irrigation", payload);

    const resultText = String(prediction?.result?.value || "");
    const dayMatch = resultText.match(/(\d+(?:\.\d+)?)\s*day/i);
    const amountMatch = resultText.match(/(\d+(?:\.\d+)?)\s*mm/i);

    const nextIrrigationTime = dayMatch
      ? `Within ${Math.round(Number(dayMatch[1]))} day(s)`
      : "Within 36 hours";

    const recommendedAmountMm = clamp(
      toNumber(amountMatch ? amountMatch[1] : NaN, 20),
      8,
      60
    );

    return res.status(200).json({
      soilMoistureLevel: clamp(toNumber(payload.soilMoisture, 55), 0, 100),
      evaporationRate: Number(clamp(2.2 + payload.temperature * 0.12 - payload.humidity * 0.03, 1.5, 8).toFixed(1)),
      nextIrrigationTime,
      recommendedAmountMm,
      recommendation:
        prediction?.recommendation ||
        `Recommended irrigation: ${recommendedAmountMm}mm ${nextIrrigationTime.toLowerCase()}.`,
      confidence: clamp(toNumber(prediction?.confidence, 76), 0, 100),
      engine: prediction?.engine || "python"
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to generate irrigation recommendation",
      detail: error.message
    });
  }
};

export const aiFertilizerRecommendation = async (req, res) => {
  try {
    const payload = buildPredictPayload(req);
    const nutrients = payload.soilNutrients || {};

    const nitrogenNeed = clamp(Math.round((78 - toNumber(nutrients.nitrogen, 40)) * 0.82), 24, 54);
    const phosphorusNeed = clamp(Math.round((42 - toNumber(nutrients.phosphorus, 22)) * 0.74), 14, 32);
    const potassiumNeed = clamp(Math.round((54 - toNumber(nutrients.potassium, 30)) * 0.72), 14, 36);

    const rows = [
      {
        nutrient: "Nitrogen",
        amount: `${nitrogenNeed} kg/acre`,
        applicationTime: "Today",
        method: "Split broadcast after irrigation"
      },
      {
        nutrient: "Phosphorus",
        amount: `${phosphorusNeed} kg/acre`,
        applicationTime: "Tomorrow",
        method: "Band placement near root zone"
      },
      {
        nutrient: "Potassium",
        amount: `${potassiumNeed} kg/acre`,
        applicationTime: "In 2 days",
        method: "Side dressing"
      },
      {
        nutrient: "Micronutrient Mix",
        amount: "3 kg/acre",
        applicationTime: "Next week",
        method: "Foliar spray"
      }
    ];

    return res.status(200).json({
      cropType: payload.cropType,
      rows,
      recommendations: rows,
      confidence: 84,
      basis: {
        nitrogen: toNumber(nutrients.nitrogen, 40),
        phosphorus: toNumber(nutrients.phosphorus, 22),
        potassium: toNumber(nutrients.potassium, 30)
      }
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to generate fertilizer recommendation",
      detail: error.message
    });
  }
};
