import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import MarketPrice from "../models/MarketPrice.js";
import CropPriceHistory from "../models/CropPriceHistory.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PYTHON_EXECUTABLE = process.env.PYTHON_EXECUTABLE || "python";
const AI_SERVICE_DIR = path.resolve(__dirname, "..", "..", "ai_service");
const PYTHON_MARKET_PREDICTOR = path.join(AI_SERVICE_DIR, "market_price_predictor.py");

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeCrop = (crop) => String(crop || "wheat").trim().toLowerCase();

const textSeed = (value = "") => {
  let hash = 0;
  const text = String(value || "").toLowerCase();

  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash * 31) + text.charCodeAt(index)) % 1000003;
  }

  return hash;
};

/* ─── Base crop data for deterministic fallbacks ──────────────────── */

const CROP_BASE_PRICES_QTL = {
  wheat: 2400, rice: 3100, cotton: 6800, maize: 1900,
  tomato: 2200, potato: 1600, onion: 1900, soybean: 4500,
  groundnut: 5400, sugarcane: 350, chilli: 9600
};

const MARKETS = [
  { name: "Ahmedabad", state: "Gujarat" },
  { name: "Surat", state: "Gujarat" },
  { name: "Rajkot", state: "Gujarat" },
  { name: "Vadodara", state: "Gujarat" },
  { name: "Delhi", state: "Delhi" },
  { name: "Indore", state: "Madhya Pradesh" },
  { name: "Jaipur", state: "Rajasthan" },
  { name: "Pune", state: "Maharashtra" },
  { name: "Nashik", state: "Maharashtra" },
  { name: "Hyderabad", state: "Telangana" },
  { name: "Bangalore", state: "Karnataka" },
  { name: "Chennai", state: "Tamil Nadu" }
];

const MARKET_FACTORS = {
  ahmedabad: 1.02, surat: 1.04, rajkot: 0.99, vadodara: 1.01,
  delhi: 1.06, indore: 0.97, jaipur: 1.0, pune: 1.03,
  nashik: 1.02, hyderabad: 1.03, bangalore: 1.05, chennai: 1.04
};

const DEMAND_LEVELS = ["High", "Medium", "Low"];

/* ─── Deterministic price generator ──────────────────────────────── */

const generateMarketPrices = (cropName) => {
  const crop = normalizeCrop(cropName);
  const basePrice = CROP_BASE_PRICES_QTL[crop] || 2000;

  return MARKETS.map((market) => {
    const seed = textSeed(`${crop}:${market.name}`);
    const factor = MARKET_FACTORS[market.name.toLowerCase()] || 1.0;
    const jitter = ((seed % 200) - 100) / basePrice;
    const price = Math.round(basePrice * factor * (1 + jitter * 0.15));
    const changePercent = parseFloat((((seed % 140) - 70) / 10).toFixed(1));
    const demandIndex = seed % 3;

    return {
      cropName: cropName.charAt(0).toUpperCase() + cropName.slice(1).toLowerCase(),
      market: market.name,
      state: market.state,
      price,
      unit: "qtl",
      priceChange: changePercent,
      demandLevel: DEMAND_LEVELS[demandIndex],
      timestamp: new Date().toISOString()
    };
  });
};

/* ─── Historical price generator (last 30 days) ─────────────────── */

const generatePriceHistory = (cropName, days = 30) => {
  const crop = normalizeCrop(cropName);
  const basePrice = CROP_BASE_PRICES_QTL[crop] || 2000;
  const history = [];
  const now = Date.now();

  for (let i = days; i >= 0; i--) {
    const date = new Date(now - i * 86400000);
    const daySeed = textSeed(`${crop}:history:${i}`);
    const seasonalWave = Math.sin((date.getMonth() + 1) * 0.52) * (basePrice * 0.06);
    const noise = ((daySeed % 200) - 100) / 100 * (basePrice * 0.04);
    const trendDrift = (days - i) * (basePrice * 0.001);

    history.push({
      cropName: cropName.charAt(0).toUpperCase() + cropName.slice(1).toLowerCase(),
      date: date.toISOString().split("T")[0],
      price: Math.round(basePrice + seasonalWave + noise + trendDrift),
      unit: "qtl"
    });
  }

  return history;
};

/* ─── AI market insights fallback ────────────────────────────────── */

const CROP_INSIGHTS = {
  wheat: { insight: "Wheat demand increasing due to reduced supply from northern states.", recommendation: "Consider selling within 4-5 days for optimal returns." },
  rice: { insight: "Rice prices stabilizing after monsoon season harvest pressure.", recommendation: "Hold for another week as export demand picks up." },
  cotton: { insight: "Cotton prices rising driven by textile industry restocking.", recommendation: "Sell now to capitalize on current high demand." },
  maize: { insight: "Maize demand rising due to reduced supply in regional markets.", recommendation: "Good time to sell — poultry feed demand is up." },
  tomato: { insight: "Tomato prices volatile due to supply disruption from southern states.", recommendation: "Sell quickly if stock is perishable; prices may drop in 3-4 days." },
  potato: { insight: "Potato supply exceeding demand in most mandis.", recommendation: "Consider cold storage if possible; prices expected to rise next month." },
  onion: { insight: "Onion exports resumed; expect price firming in next 10 days.", recommendation: "Hold stocks briefly for 5-7% price improvement." },
  soybean: { insight: "Soybean demand strong from oil extraction units.", recommendation: "Sell at current prices — market well balanced." },
  groundnut: { insight: "Groundnut arrivals lower than expected; prices firm.", recommendation: "Good time to sell — supply shortage supporting prices." },
  sugarcane: { insight: "Sugarcane prices set by government FRP; limited market variation.", recommendation: "Supply to nearest sugar mill for guaranteed pricing." },
  chilli: { insight: "Chilli export demand strong; prices at seasonal high.", recommendation: "Sell now to maximize returns before new crop arrivals." }
};

const generateInsights = (cropName) => {
  const crop = normalizeCrop(cropName);
  const data = CROP_INSIGHTS[crop] || {
    insight: `${cropName} market conditions are stable with moderate trading volumes.`,
    recommendation: "Monitor market for 2-3 days before making selling decision."
  };

  return {
    insight: data.insight,
    recommendation: data.recommendation,
    confidence: clamp(75 + (textSeed(crop) % 20), 70, 95)
  };
};

/* ─── Profitability calculator ───────────────────────────────────── */

const PRODUCTION_COSTS = {
  wheat: 1800, rice: 2200, cotton: 4200, maize: 1400,
  tomato: 1500, potato: 1100, onion: 1300, soybean: 3200,
  groundnut: 3800, sugarcane: 250, chilli: 6500
};

const calculateProfitability = (cropName, marketPrice) => {
  const crop = normalizeCrop(cropName);
  const productionCost = PRODUCTION_COSTS[crop] || 1500;
  const price = toNumber(marketPrice, CROP_BASE_PRICES_QTL[crop] || 2000);
  const profit = price - productionCost;
  const margin = price > 0 ? ((profit / price) * 100) : 0;

  return {
    productionCost,
    marketPrice: price,
    estimatedProfit: profit,
    profitMargin: parseFloat(margin.toFixed(1)),
    unit: "qtl",
    status: profit > 0 ? "Profitable" : "Loss"
  };
};

/* ─── Nearby market comparison ───────────────────────────────────── */

const generateNearbyMarkets = (cropName, baseMarket = "Ahmedabad") => {
  const crop = normalizeCrop(cropName);
  const basePrice = CROP_BASE_PRICES_QTL[crop] || 2000;

  const nearby = MARKETS.filter((m) => m.name.toLowerCase() !== baseMarket.toLowerCase()).slice(0, 6);

  return nearby.map((market) => {
    const seed = textSeed(`${crop}:nearby:${market.name}`);
    const factor = MARKET_FACTORS[market.name.toLowerCase()] || 1.0;
    const jitter = ((seed % 160) - 80) / basePrice;
    const price = Math.round(basePrice * factor * (1 + jitter * 0.12));
    const demandIndex = seed % 3;

    return {
      market: market.name,
      state: market.state,
      price,
      unit: "qtl",
      demandLevel: DEMAND_LEVELS[demandIndex]
    };
  }).sort((a, b) => b.price - a.price);
};

/* ─── Demand heatmap ─────────────────────────────────────────────── */

const generateDemandHeatmap = (cropName) => {
  const crop = normalizeCrop(cropName);

  return MARKETS.map((market) => {
    const seed = textSeed(`${crop}:heatmap:${market.name}`);
    const demandScore = clamp(40 + (seed % 55), 20, 95);
    const demandLevel = demandScore >= 70 ? "High" : demandScore >= 45 ? "Medium" : "Low";

    return {
      market: market.name,
      state: market.state,
      demandScore,
      demandLevel
    };
  }).sort((a, b) => b.demandScore - a.demandScore);
};

/* ─── Python AI prediction call ──────────────────────────────────── */

const callPythonPredictor = (payload) => {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";

    const child = spawn(PYTHON_EXECUTABLE, [PYTHON_MARKET_PREDICTOR], {
      cwd: AI_SERVICE_DIR,
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 5000
    });

    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve(null);
    }, 4000);

    child.on("close", (code) => {
      clearTimeout(timer);

      if (code !== 0 || !stdout.trim()) {
        resolve(null);
        return;
      }

      try {
        resolve(JSON.parse(stdout.trim()));
      } catch {
        resolve(null);
      }
    });

    child.on("error", () => {
      clearTimeout(timer);
      resolve(null);
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
};

/* ─── PUBLIC EXPORTS ─────────────────────────────────────────────── */

export const getMarketPricesForCrop = async (cropName) => {
  const crop = normalizeCrop(cropName);

  /* Try DB first */
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dbPrices = await MarketPrice.find({
    cropName: new RegExp(`^${crop}$`, "i"),
    timestamp: { $gte: cutoff }
  }).sort({ timestamp: -1 }).limit(20).lean();

  if (dbPrices.length >= 3) {
    return dbPrices.map((row) => ({
      cropName: row.cropName,
      market: row.market,
      state: row.state || "",
      price: row.price,
      unit: row.unit || "qtl",
      priceChange: row.priceChange || 0,
      demandLevel: row.demandLevel || "Medium",
      timestamp: row.timestamp
    }));
  }

  return generateMarketPrices(cropName);
};

export const getCropPriceTrends = async (cropName, days = 30) => {
  const crop = normalizeCrop(cropName);
  const cutoff = new Date(Date.now() - days * 86400000);

  const dbHistory = await CropPriceHistory.find({
    cropName: new RegExp(`^${crop}$`, "i"),
    date: { $gte: cutoff }
  }).sort({ date: 1 }).lean();

  if (dbHistory.length >= 5) {
    return dbHistory.map((row) => ({
      cropName: row.cropName,
      date: row.date,
      price: row.price,
      unit: row.unit || "qtl"
    }));
  }

  return generatePriceHistory(cropName, days);
};

export const getAIPricePrediction = async (cropName) => {
  const crop = normalizeCrop(cropName);
  const history = await getCropPriceTrends(cropName, 30);
  const prices = history.map((h) => h.price);

  /* Try Python AI first */
  const pyResult = await callPythonPredictor({
    action: "predict_price",
    crop,
    history: prices
  });

  if (pyResult && pyResult.predictedPriceWeek) {
    return {
      currentPrice: prices[prices.length - 1] || 0,
      predictedPriceWeek: pyResult.predictedPriceWeek,
      predictedPriceMonth: pyResult.predictedPriceMonth,
      demandLevel: pyResult.demandLevel || "Medium",
      confidence: pyResult.confidence || 80,
      trend: pyResult.trend || "stable",
      engine: "python"
    };
  }

  /* Node fallback */
  const currentPrice = prices.length ? prices[prices.length - 1] : (CROP_BASE_PRICES_QTL[crop] || 2000);
  const recentAvg = prices.length >= 7
    ? prices.slice(-7).reduce((s, p) => s + p, 0) / 7
    : currentPrice;
  const trendPct = currentPrice > 0 ? ((currentPrice - recentAvg) / currentPrice) : 0;

  const weekFactor = 1 + clamp(trendPct * 1.5, -0.08, 0.08);
  const monthFactor = 1 + clamp(trendPct * 3.2, -0.15, 0.18);

  const predictedWeek = Math.round(currentPrice * weekFactor);
  const predictedMonth = Math.round(currentPrice * monthFactor);

  const demandLevel = trendPct > 0.03 ? "High" : trendPct > -0.02 ? "Medium" : "Low";
  const trend = trendPct > 0.02 ? "rising" : trendPct < -0.02 ? "falling" : "stable";

  return {
    currentPrice,
    predictedPriceWeek: predictedWeek,
    predictedPriceMonth: predictedMonth,
    demandLevel,
    confidence: clamp(72 + (textSeed(crop) % 18), 70, 92),
    trend,
    engine: "node-fallback"
  };
};

export const getMarketInsights = (cropName) => {
  return generateInsights(cropName);
};

export const getCropProfitability = async (cropName) => {
  const prices = await getMarketPricesForCrop(cropName);
  const avgPrice = prices.length
    ? Math.round(prices.reduce((sum, p) => sum + p.price, 0) / prices.length)
    : (CROP_BASE_PRICES_QTL[normalizeCrop(cropName)] || 2000);

  return calculateProfitability(cropName, avgPrice);
};

export const getNearbyMarketComparison = (cropName, baseMarket) => {
  return generateNearbyMarkets(cropName, baseMarket);
};

export const getDemandHeatmap = (cropName) => {
  return generateDemandHeatmap(cropName);
};
