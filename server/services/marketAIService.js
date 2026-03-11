import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PYTHON_EXECUTABLE = process.env.PYTHON_EXECUTABLE || "python";
const AI_SERVICE_DIR = path.resolve(__dirname, "..", "..", "ai_service");
const PYTHON_MARKETPLACE_ENTRY = path.join(AI_SERVICE_DIR, "marketplace_ai.py");

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const CROP_BASE_PRICES = {
  tomato: 22,
  onion: 19,
  potato: 16,
  rice: 32,
  wheat: 28,
  maize: 24,
  cotton: 68,
  soybean: 45,
  groundnut: 54,
  sugarcane: 4,
  chilli: 96
};

const LOCATION_FACTORS = {
  surat: 1.04,
  nashik: 1.03,
  pune: 1.02,
  ahmedabad: 1.01,
  delhi: 1.06,
  indore: 0.99,
  jaipur: 1,
  bangalore: 1.05,
  hyderabad: 1.03,
  chennai: 1.04
};

const normalizeCrop = (crop) => String(crop || "tomato").trim().toLowerCase();
const normalizeLocation = (location) => String(location || "").trim().toLowerCase();
const textSeed = (value = "") => {
  let hash = 0;

  for (let index = 0; index < String(value).length; index += 1) {
    hash = ((hash * 31) + String(value).charCodeAt(index)) % 1000003;
  }

  return hash;
};

const parseLast7DayPrice = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => toNumber(item, NaN)).filter((item) => Number.isFinite(item));
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => toNumber(item.trim(), NaN))
      .filter((item) => Number.isFinite(item));
  }

  return [];
};

const parseDemandScore = (demand) => {
  if (typeof demand === "number") {
    return clamp(demand, 0, 100);
  }

  const text = String(demand || "").trim().toLowerCase();

  if (text === "high") {
    return 82;
  }

  if (text === "medium") {
    return 58;
  }

  if (text === "low") {
    return 34;
  }

  return 56;
};

const parsePythonOutput = (rawStdout) => {
  const value = String(rawStdout || "").trim();

  if (!value) {
    throw new Error("Marketplace AI returned empty response");
  }

  const lines = value.split(/\r?\n/).filter(Boolean);
  const lastLine = lines[lines.length - 1] || value;
  const parsed = JSON.parse(lastLine);

  if (parsed?.error) {
    throw new Error(parsed.error);
  }

  return parsed;
};

const runPythonAction = (action, payload, timeoutMs = 2600) =>
  new Promise((resolve, reject) => {
    const processHandle = spawn(PYTHON_EXECUTABLE, [PYTHON_MARKETPLACE_ENTRY, action], {
      cwd: AI_SERVICE_DIR,
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const finishError = (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      reject(error instanceof Error ? error : new Error(String(error)));
    };

    const finishSuccess = (value) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      resolve(value);
    };

    const timer = setTimeout(() => {
      processHandle.kill("SIGTERM");
      finishError(new Error(`Marketplace AI timeout for action '${action}'`));
    }, timeoutMs);

    processHandle.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    processHandle.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    processHandle.on("error", (error) => {
      finishError(error);
    });

    processHandle.stdin.on("error", (error) => {
      if (error?.code === "EOF") {
        finishError(new Error(`Marketplace AI stdin closed before payload write for action '${action}'`));
        return;
      }

      finishError(error);
    });

    processHandle.on("close", (code) => {
      if (code !== 0) {
        const detail = stderr.trim() || stdout.trim() || `Python exit code ${code}`;
        finishError(new Error(detail));
        return;
      }

      try {
        const parsed = parsePythonOutput(stdout);
        finishSuccess(parsed);
      } catch (error) {
        finishError(error);
      }
    });

    try {
      processHandle.stdin.end(JSON.stringify(payload));
    } catch (error) {
      finishError(error);
    }
  });

const fallbackPriceSuggestion = (payload = {}) => {
  const crop = normalizeCrop(payload.crop || payload.cropName);
  const location = normalizeLocation(payload.location);
  const quantity = Math.max(1, toNumber(payload.quantity, 100));
  const demandScore = parseDemandScore(payload.demand);
  const last7 = parseLast7DayPrice(payload.last_7_day_price || payload.last7DayPrice);

  const basePrice = CROP_BASE_PRICES[crop] || 24;
  const locationFactor = LOCATION_FACTORS[location] || 1;
  const last7Average = last7.length
    ? last7.reduce((sum, value) => sum + value, 0) / last7.length
    : basePrice;

  const trendBoost = ((last7Average - basePrice) / Math.max(basePrice, 1)) * 0.35;
  const demandBoost = (demandScore - 50) / 170;
  const quantityAdjustment = quantity > 1200 ? -0.06 : quantity > 600 ? -0.03 : quantity < 140 ? 0.03 : 0;

  const suggestedPrice = clamp(
    basePrice * locationFactor * (1 + trendBoost + demandBoost + quantityAdjustment),
    4,
    300
  );

  const confidence = clamp(
    88 - Math.abs(trendBoost * 100) * 0.2 + Math.min(last7.length, 7) * 0.7,
    67,
    96
  );

  return {
    suggested_price: Number(suggestedPrice.toFixed(2)),
    confidence: Math.round(confidence),
    confidence_score: Math.round(confidence),
    currency: "INR/kg",
    demand_level: demandScore >= 70 ? "HIGH" : demandScore >= 45 ? "MEDIUM" : "LOW",
    engine: "node-fallback",
    factors: {
      crop,
      location_factor: Number(locationFactor.toFixed(2)),
      demand_score: Math.round(demandScore),
      trend_index: Number(trendBoost.toFixed(3)),
      quantity_adjustment: Number(quantityAdjustment.toFixed(3))
    }
  };
};

const fallbackDemandPrediction = (payload = {}) => {
  const crop = normalizeCrop(payload.crop || payload.cropName);
  const location = normalizeLocation(payload.location);
  const basePrice = CROP_BASE_PRICES[crop] || 24;
  const locationFactor = LOCATION_FACTORS[location] || 1;
  const last7 = parseLast7DayPrice(payload.last_7_day_price || payload.last7DayPrice);

  const trendPulse = last7.length
    ? ((last7[last7.length - 1] - last7[0]) / Math.max(last7[0], 1)) * 30
    : 5;

  const seasonalPulse = Math.sin((new Date().getMonth() + 1) * 0.62) * 11;
  const demandScore = clamp(58 + trendPulse + seasonalPulse + (locationFactor - 1) * 40, 18, 96);
  const demandLevel = demandScore >= 72 ? "HIGH" : demandScore >= 46 ? "MEDIUM" : "LOW";

  const expectedPrice = clamp(basePrice * locationFactor * (1 + (demandScore - 50) / 150), 4, 320);
  const confidence = clamp(80 + Math.min(last7.length, 7) * 1.1, 70, 95);

  return {
    demand_level: demandLevel,
    demand_score: Number(demandScore.toFixed(1)),
    expected_price: Number(expectedPrice.toFixed(2)),
    confidence: Math.round(confidence),
    horizon: "next_7_days",
    engine: "node-fallback"
  };
};

const fallbackQualityDetection = (payload = {}) => {
  const crop = normalizeCrop(payload.crop || payload.cropName);
  const imageBase64 = String(payload.imageBase64 || "").trim();
  const rawLength = imageBase64.includes(",") ? imageBase64.split(",")[1].length : imageBase64.length;

  const signal = clamp(24 + Math.log10(rawLength + 10) * 16, 22, 95);
  const freshnessScore = clamp(signal + Math.sin(rawLength * 0.0001) * 6, 20, 98);

  let qualityGrade = "C";
  if (freshnessScore >= 85) {
    qualityGrade = "A";
  } else if (freshnessScore >= 65) {
    qualityGrade = "B";
  }

  const diseaseRisk = clamp(100 - freshnessScore + (qualityGrade === "C" ? 12 : 0), 4, 86);
  const confidence = clamp(74 + Math.min(rawLength / 12000, 18), 64, 94);

  return {
    crop,
    quality_grade: `Grade ${qualityGrade}`,
    freshness_score: Number(freshnessScore.toFixed(1)),
    disease_risk: Number(diseaseRisk.toFixed(1)),
    confidence: Math.round(confidence),
    recommendation:
      qualityGrade === "A"
        ? "Suitable for premium buyers and long-distance dispatch."
        : qualityGrade === "B"
          ? "Sell quickly in local mandi and improve sorting for premium buyers."
          : "Prioritize immediate sale, separate damaged produce, and avoid long transit.",
    engine: "node-fallback"
  };
};

const fallbackLogisticsEstimate = (payload = {}) => {
  const pickup = String(payload.pickup || payload.pickupLocation || "Farm").trim() || "Farm";
  const drop = String(payload.drop || payload.dropLocation || payload.location || "Market").trim() || "Market";
  const vehicleType = String(payload.vehicleType || "mini-truck").trim().toLowerCase();
  const seed = textSeed(`${pickup.toLowerCase()}::${drop.toLowerCase()}`);

  const rawDistance = toNumber(payload.distance_km ?? payload.distanceKm, NaN);
  const distanceKm = Number.isFinite(rawDistance) && rawDistance > 0
    ? clamp(rawDistance, 1, 120)
    : Number((4 + ((seed % 5400) / 100)).toFixed(1));

  const rateMap = {
    bike: 7.5,
    auto: 12,
    "mini-truck": 18,
    truck: 25
  };

  const baseMap = {
    bike: 60,
    auto: 110,
    "mini-truck": 220,
    truck: 460
  };

  const safeVehicle = rateMap[vehicleType] ? vehicleType : "mini-truck";
  const hour = new Date().getHours();
  const rushFactor = (hour >= 8 && hour <= 11) || (hour >= 17 && hour <= 20) ? 1.18 : 1;

  const estimatedCost = clamp(baseMap[safeVehicle] + (distanceKm * rateMap[safeVehicle] * rushFactor), 80, 12000);
  const etaHours = clamp((distanceKm / 27) * rushFactor + 0.35, 0.3, 9.5);
  const confidence = clamp(92 - (distanceKm * 0.15), 72, 95);

  return {
    pickup,
    drop,
    distance_km: Number(distanceKm.toFixed(1)),
    estimated_cost_inr: Math.round(estimatedCost),
    eta_hours: Number(etaHours.toFixed(2)),
    recommended_vehicle: safeVehicle,
    payment_methods: ["UPI", "Bank Transfer", "Wallet"],
    confidence: Math.round(confidence),
    engine: "node-fallback"
  };
};

const fallbackSellAssistant = (payload = {}) => {
  const crop = normalizeCrop(payload.crop || payload.cropName);
  const location = normalizeLocation(payload.location);
  const quantity = Math.max(1, toNumber(payload.quantity, 100));
  const shelfLifeDays = clamp(toNumber(payload.shelfLifeDays, 7), 1, 45);
  const moisturePercent = clamp(toNumber(payload.moisturePercent, 12), 0, 100);
  const grade = String(payload.grade || payload.qualityGrade || "B").trim().toUpperCase() || "B";
  const qualityType = String(payload.qualityType || "normal").trim().toLowerCase();
  const packagingType = String(payload.packagingType || "standard-bag").trim().toLowerCase();

  const priceSuggestion = fallbackPriceSuggestion(payload);
  const demandPrediction = fallbackDemandPrediction(payload);

  const gradeFactorMap = {
    A: 1.07,
    B: 1,
    C: 0.93
  };

  const packagingFactorMap = {
    "crate": 1.03,
    "cold-box": 1.06,
    "jute-bag": 1.01,
    "standard-bag": 1
  };

  const gradeFactor = gradeFactorMap[grade] || 0.98;
  const organicFactor = qualityType === "organic" ? 1.05 : 1;
  const packagingFactor = packagingFactorMap[packagingType] || 1;
  const moisturePenalty = moisturePercent > 14 ? clamp((moisturePercent - 14) * 0.01, 0, 0.11) : 0;
  const shelfLifeFactor = shelfLifeDays <= 3 ? 0.92 : shelfLifeDays <= 7 ? 0.98 : 1.03;

  const idealPrice = clamp(
    priceSuggestion.suggested_price * gradeFactor * organicFactor * packagingFactor * shelfLifeFactor * (1 - moisturePenalty),
    4,
    360
  );

  const demandScore = toNumber(demandPrediction.demand_score, 56);
  const matchRate = clamp(
    44 + (demandScore * 0.42) + (grade === "A" ? 9 : grade === "B" ? 5 : 2) + (qualityType === "organic" ? 7 : 0),
    35,
    96
  );

  const readiness = clamp(
    54 + (demandScore * 0.22) + (shelfLifeDays >= 7 ? 8 : 3) + (quantity >= 500 ? 7 : 2) + (grade === "A" ? 8 : grade === "B" ? 4 : 0) - (moisturePenalty * 100 * 0.55),
    32,
    98
  );

  const urgency = shelfLifeDays <= 3 || demandScore < 42
    ? "HIGH"
    : shelfLifeDays <= 7 || demandScore < 58
      ? "MEDIUM"
      : "LOW";

  const minPrice = clamp(idealPrice * 0.94, 4, 340);
  const maxPrice = clamp(idealPrice * 1.07, 5, 380);

  const riskFlags = [];
  if (shelfLifeDays <= 3) {
    riskFlags.push("Short shelf-life: prioritize nearby buyers and same-day pickup.");
  }
  if (moisturePercent > 14) {
    riskFlags.push("High moisture can reduce buyer confidence and negotiated price.");
  }
  if (quantity > 1800) {
    riskFlags.push("Large lot size: split into tranches to improve conversion speed.");
  }

  const recommendations = [
    `Start negotiations near Rs ${Number(maxPrice.toFixed(2))}/kg, close above Rs ${Number(minPrice.toFixed(2))}/kg.`,
    "Publish listing with grade, moisture, and packaging details to increase trust.",
    urgency === "HIGH"
      ? "Promote instant dispatch and flexible pickup windows."
      : "Run buyer outreach in two waves: early morning and evening mandis."
  ];

  return {
    crop,
    location,
    demand_level: demandPrediction.demand_level,
    demand_score: Number(demandScore.toFixed(1)),
    readiness_score: Math.round(readiness),
    urgency,
    expected_buyer_match_rate: Math.round(matchRate),
    recommended_price_band: {
      min: Number(minPrice.toFixed(2)),
      ideal: Number(idealPrice.toFixed(2)),
      max: Number(maxPrice.toFixed(2)),
      currency: "INR/kg"
    },
    signals: {
      grade,
      quality_type: qualityType,
      packaging_type: packagingType,
      shelf_life_days: shelfLifeDays,
      moisture_percent: Number(moisturePercent.toFixed(1)),
      quantity
    },
    risk_flags: riskFlags,
    recommendations,
    model: "Farmer Sell Assistant v2",
    engine: "node-fallback"
  };
};

const withPythonFallback = async (action, payload, fallbackFn) => {
  try {
    const response = await runPythonAction(action, payload);
    return {
      ...response,
      engine: "python"
    };
  } catch (error) {
    const fallback = fallbackFn(payload);
    return {
      ...fallback,
      fallbackReason: error.message,
      engine: fallback.engine || "node-fallback"
    };
  }
};

export const suggestPrice = async (payload = {}) => {
  return withPythonFallback("price", payload, fallbackPriceSuggestion);
};

export const predictDemand = async (payload = {}) => {
  return withPythonFallback("demand", payload, fallbackDemandPrediction);
};

export const detectCropQuality = async (payload = {}) => {
  return withPythonFallback("quality", payload, fallbackQualityDetection);
};

export const estimateLogistics = async (payload = {}) => {
  return withPythonFallback("logistics", payload, fallbackLogisticsEstimate);
};

export const buildSellAssistant = async (payload = {}) => {
  return withPythonFallback("sell_assistant", payload, fallbackSellAssistant);
};
