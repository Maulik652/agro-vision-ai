import CropListing from "../models/CropListing.js";
import MarketTrend from "../models/MarketTrend.js";
import ScanHistory from "../models/ScanHistory.js";
import CropScanReport from "../models/CropScanReport.js";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const textSeed = (value = "") => {
  let hash = 0;
  const text = String(value || "").toLowerCase();

  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash * 31) + text.charCodeAt(index)) % 1000003;
  }

  return hash;
};

const pickActiveCrop = (rawCrops) => {
  const text = String(rawCrops || "").trim();
  if (!text) {
    return "Wheat";
  }

  const first = text.split(",").map((item) => item.trim()).filter(Boolean)[0];
  return first || "Wheat";
};

const buildSeasonalWeather = ({ city, state }) => {
  const now = new Date();
  const month = now.getMonth();
  const seed = textSeed(`${city}:${state}`);

  const seasonalTemp = [22, 25, 29, 33, 36, 34, 30, 29, 30, 29, 26, 23][month] ?? 29;
  const tempOffset = ((seed % 9) - 4) * 0.6;
  const monsoonBoost = [5, 6, 7, 8].includes(month) ? 18 : [4, 9].includes(month) ? 8 : 0;

  const temperature = clamp(Math.round(seasonalTemp + tempOffset), 14, 44);
  const humidity = clamp(
    Math.round(46 + (seed % 18) + monsoonBoost + (28 - Math.abs(temperature - 28)) * 0.2),
    24,
    96
  );

  const rainProbability = clamp(
    Math.round((humidity * 0.72) + ([5, 6, 7, 8].includes(month) ? 8 : -10)),
    6,
    95
  );

  const windSpeed = clamp(Math.round(6 + (seed % 8) + rainProbability * 0.08), 4, 24);

  const condition =
    rainProbability >= 78
      ? "Thunderstorm"
      : rainProbability >= 58
      ? "Light Rain"
      : rainProbability >= 38
      ? "Cloudy"
      : "Partly Cloudy";

  return {
    condition,
    temperature,
    humidity,
    rainProbability,
    windSpeed
  };
};

const buildForecast = (current) =>
  [0, 1, 2, 3, 4].map((index) => {
    const rainProbability = clamp(
      Math.round(current.rainProbability + Math.sin(index * 1.2) * 10 + (index - 2) * 2),
      5,
      96
    );

    const temperature = clamp(
      Math.round(current.temperature + Math.cos(index * 0.9) * 2 - (rainProbability >= 70 ? 2 : 0)),
      12,
      45
    );

    const humidity = clamp(
      Math.round(current.humidity + (rainProbability - current.rainProbability) * 0.35),
      22,
      97
    );

    const condition =
      rainProbability >= 80
        ? "Thunderstorm"
        : rainProbability >= 60
        ? "Light Rain"
        : rainProbability >= 35
        ? "Cloudy"
        : "Sunny";

    const date = new Date();
    date.setDate(date.getDate() + index);

    return {
      date,
      day: index === 0 ? "Today" : date.toLocaleDateString("en-US", { weekday: "short" }),
      condition,
      temperature,
      humidity,
      rainProbability
    };
  });

const buildSoilData = ({ weatherCurrent, cropType, seedValue }) => {
  const cropKey = String(cropType || "").toLowerCase();

  const cropOffset = {
    wheat: { n: 3, p: -1, k: 1, moisture: -2 },
    rice: { n: 1, p: 1, k: 0, moisture: 8 },
    tomato: { n: 2, p: 0, k: 3, moisture: 2 },
    cotton: { n: 0, p: -2, k: 2, moisture: -1 },
    maize: { n: 2, p: 0, k: 1, moisture: 1 },
    soybean: { n: -3, p: 2, k: 1, moisture: 0 }
  }[cropKey] || { n: 0, p: 0, k: 0, moisture: 0 };

  const moisture = clamp(
    Math.round(58 + cropOffset.moisture + (weatherCurrent.humidity - 60) * 0.25 - (weatherCurrent.temperature - 30) * 1.1),
    18,
    92
  );

  const nitrogen = clamp(Math.round(40 + cropOffset.n + ((seedValue % 11) - 5)), 18, 72);
  const phosphorus = clamp(Math.round(22 + cropOffset.p + ((seedValue % 7) - 3)), 10, 46);
  const potassium = clamp(Math.round(30 + cropOffset.k + ((seedValue % 9) - 4)), 12, 58);

  const evaporationRate = Number(
    clamp(2.4 + weatherCurrent.temperature * 0.12 - weatherCurrent.humidity * 0.03, 1.8, 8.0).toFixed(1)
  );

  const nextIrrigationTime =
    moisture < 40
      ? "Within 24 hours"
      : moisture < 55
      ? "Within 36 hours"
      : moisture < 70
      ? "Within 48 hours"
      : "Within 72 hours";

  return {
    moisture,
    nitrogen,
    phosphorus,
    potassium,
    evaporationRate,
    nextIrrigationTime
  };
};

const marketAdviceByTrend = {
  rising: "Hold crop for better mandi rates over the next 3 to 5 days",
  stable: "Sell in phased lots to balance cash flow and price opportunity",
  falling: "Prioritize quick selling to reduce downside risk"
};

const inferTrend = (score) => {
  if (score >= 68) {
    return "rising";
  }

  if (score <= 40) {
    return "falling";
  }

  return "stable";
};

const buildFallbackMarketRows = (location) => [
  { crop: "Wheat", currentPrice: 2350, trend: "rising", advice: marketAdviceByTrend.rising, location },
  { crop: "Rice", currentPrice: 3100, trend: "stable", advice: marketAdviceByTrend.stable, location },
  { crop: "Tomato", currentPrice: 1800, trend: "falling", advice: marketAdviceByTrend.falling, location },
  { crop: "Soybean", currentPrice: 4450, trend: "rising", advice: marketAdviceByTrend.rising, location }
];

const buildFarmRisk = (plantHealthScore, weatherCurrent, scanSeverity) => {
  const riskIndex = clamp(
    Math.round(
      (100 - plantHealthScore) * 0.55 +
      weatherCurrent.rainProbability * 0.22 +
      toNumber(scanSeverity, 45) * 0.23
    ),
    5,
    96
  );

  if (riskIndex >= 70) {
    return "High";
  }

  if (riskIndex <= 35) {
    return "Low";
  }

  return "Medium";
};

export const getFarmProfile = async (req, res) => {
  try {
    const user = req.user;
    const city = String(user?.city || "Unknown City").trim();
    const state = String(user?.state || "Unknown State").trim();
    const location = `${city}, ${state}`;

    const activeCrop = pickActiveCrop(user?.crops);
    const weatherCurrent = buildSeasonalWeather({ city, state });

    const [latestScanHistory, latestScanReport] = await Promise.all([
      ScanHistory.findOne({ farmerId: user._id }).sort({ date: -1 }).lean(),
      CropScanReport.findOne({ user: user._id }).sort({ createdAt: -1 }).lean()
    ]);

    const plantHealthScore = clamp(
      Math.round(
        toNumber(
          latestScanHistory?.healthScore ?? latestScanReport?.healthScore,
          82
        )
      ),
      0,
      100
    );

    const scanSeverity = toNumber(latestScanHistory?.severity, 45);
    const riskLevel = buildFarmRisk(plantHealthScore, weatherCurrent, scanSeverity);

    const farmSizeAcres = clamp(toNumber(user?.farmSize, 2), 0.2, 20000);
    const soilHealthScore = clamp(
      Math.round(64 + (plantHealthScore - 50) * 0.35 + ((textSeed(location) % 12) - 6)),
      40,
      97
    );

    return res.status(200).json({
      farmerId: user._id,
      name: user?.name || "Farmer",
      location,
      city,
      state,
      activeCrop,
      cropType: activeCrop,
      growthStage: "Vegetative",
      farmSizeAcres,
      farmSize: farmSizeAcres,
      soilHealthScore,
      plantHealthScore,
      riskLevel
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to fetch farm profile",
      detail: error.message
    });
  }
};

export const getWeatherCurrent = async (req, res) => {
  try {
    const city = String(req.user?.city || "Unknown City").trim();
    const state = String(req.user?.state || "Unknown State").trim();
    const current = buildSeasonalWeather({ city, state });

    return res.status(200).json({
      ...current,
      city,
      state,
      observedAt: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to fetch weather data",
      detail: error.message
    });
  }
};

export const getWeatherForecast = async (req, res) => {
  try {
    const city = String(req.user?.city || "Unknown City").trim();
    const state = String(req.user?.state || "Unknown State").trim();

    const current = buildSeasonalWeather({ city, state });
    const forecast = buildForecast(current);

    return res.status(200).json({
      city,
      state,
      forecast
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to fetch forecast",
      detail: error.message
    });
  }
};

export const getSoilData = async (req, res) => {
  try {
    const city = String(req.user?.city || "Unknown City").trim();
    const state = String(req.user?.state || "Unknown State").trim();
    const cropType = pickActiveCrop(req.user?.crops);

    const weatherCurrent = buildSeasonalWeather({ city, state });
    const seedValue = textSeed(`${city}:${state}:${cropType}`);
    const soilData = buildSoilData({ weatherCurrent, cropType, seedValue });

    return res.status(200).json({
      ...soilData,
      cropType,
      sampledAt: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to fetch soil data",
      detail: error.message
    });
  }
};

export const getMarketPrices = async (req, res) => {
  try {
    const city = String(req.user?.city || "").trim();
    const state = String(req.user?.state || "").trim();
    const cityPattern = city ? new RegExp(`^${escapeRegex(city)}$`, "i") : null;
    const location = { city, state };

    const twoWeeksAgo = new Date(Date.now() - (14 * 24 * 60 * 60 * 1000));

    const trendRows = await MarketTrend.aggregate([
      {
        $match: {
          date: { $gte: twoWeeksAgo },
          ...(cityPattern ? { "location.city": cityPattern } : {})
        }
      },
      {
        $group: {
          _id: "$cropName",
          avgPrice: { $avg: "$pricePerKg" },
          avgDemand: { $avg: "$demandScore" },
          samples: { $sum: 1 }
        }
      },
      { $sort: { avgDemand: -1, samples: -1 } },
      { $limit: 8 }
    ]);

    let rows = trendRows;

    if (!rows.length) {
      rows = await CropListing.aggregate([
        { $match: { isActive: true, ...(cityPattern ? { "location.city": cityPattern } : {}) } },
        {
          $group: {
            _id: "$cropName",
            avgPrice: { $avg: "$price" },
            avgDemand: {
              $avg: {
                $ifNull: ["$aiConfidence", 56]
              }
            },
            samples: { $sum: 1 }
          }
        },
        { $sort: { avgDemand: -1, samples: -1 } },
        { $limit: 8 }
      ]);
    }

    if (!rows.length) {
      return res.status(200).json({
        prices: buildFallbackMarketRows(location)
      });
    }

    const prices = rows.map((row) => {
      const demandScore = clamp(Number(row.avgDemand || 55), 0, 100);
      const trend = inferTrend(demandScore);

      return {
        crop: row._id,
        cropName: row._id,
        currentPrice: Math.round(Number(row.avgPrice || 0)),
        price: Math.round(Number(row.avgPrice || 0)),
        demandScore: Number(demandScore.toFixed(1)),
        trend,
        advice: marketAdviceByTrend[trend],
        samples: Number(row.samples || 0)
      };
    });

    return res.status(200).json({
      prices
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to fetch market prices",
      detail: error.message
    });
  }
};
