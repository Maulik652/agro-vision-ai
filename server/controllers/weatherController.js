import WeatherData from "../models/WeatherData.js";
import { getWeatherAnalysis, getWeatherSnapshot } from "../services/weatherService.js";

const SNAPSHOT_SAVE_INTERVAL_MS = Number(process.env.WEATHER_SAVE_INTERVAL_MS || 2 * 60 * 60 * 1000);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getActiveCrop = (req) => {
  const fromQuery = String(req.query.cropType || "").trim();
  if (fromQuery) {
    return fromQuery;
  }

  const fromUser = String(req.user?.crops || "").trim();
  if (!fromUser) {
    return "General Crop";
  }

  return fromUser.split(",").map((item) => item.trim()).filter(Boolean)[0] || "General Crop";
};

const persistWeatherSnapshot = async ({ farmerId, cropType, snapshot, analysis = null }) => {
  if (!farmerId || !snapshot?.location?.key) {
    return;
  }

  const since = new Date(Date.now() - SNAPSHOT_SAVE_INTERVAL_MS);

  const recent = await WeatherData.findOne({
    farmerId,
    "location.key": snapshot.location.key,
    timestamp: { $gte: since }
  })
    .sort({ timestamp: -1 })
    .lean();

  if (recent) {
    if (analysis && !recent.analysis) {
      await WeatherData.updateOne(
        { _id: recent._id },
        {
          $set: {
            analysis
          }
        }
      );
    }

    return;
  }

  await WeatherData.create({
    farmerId,
    cropType,
    location: snapshot.location,
    temperature: snapshot.current.temperature,
    humidity: snapshot.current.humidity,
    rainfall: snapshot.current.rainfall,
    windSpeed: snapshot.current.windSpeed,
    rainProbability: snapshot.current.rainProbability,
    cloudCoverage: snapshot.current.cloudCoverage,
    uvIndex: snapshot.current.uvIndex,
    condition: snapshot.current.condition,
    forecast: snapshot.forecast,
    analysis,
    source: snapshot.source,
    timestamp: new Date(snapshot.current.updatedAt || Date.now())
  });
};

const buildHistoryRows = ({ records = [], forecast = [] }) => {
  const fromDb = [...records]
    .reverse()
    .map((row) => ({
      day: new Date(row.timestamp || row.createdAt || Date.now()).toLocaleDateString("en-US", {
        weekday: "short"
      }),
      temperature: Math.round(toNumber(row.temperature, 30)),
      rainfall: Math.round(
        clamp(
          toNumber(row.rainProbability, NaN) || toNumber(row.rainfall, 0) * 8,
          0,
          100
        )
      )
    }));

  if (fromDb.length >= 7) {
    return fromDb.slice(-7);
  }

  const needed = 7 - fromDb.length;
  const fromForecast = forecast.slice(0, needed).map((row) => ({
    day: String(row.dayShort || row.day || "Day"),
    temperature: Math.round(toNumber(row.temperature, 30)),
    rainfall: Math.round(clamp(toNumber(row.rainProbability, 30), 0, 100))
  }));

  return [...fromDb, ...fromForecast].slice(-7);
};

export const getCurrentWeather = async (req, res) => {
  try {
    const forceFresh = String(req.query.force || "false").toLowerCase() === "true";
    const snapshot = await getWeatherSnapshot({
      query: req.query,
      user: req.user,
      forceFresh
    });

    await persistWeatherSnapshot({
      farmerId: req.user._id,
      cropType: getActiveCrop(req),
      snapshot
    });

    return res.status(200).json({
      ...snapshot.current,
      location: snapshot.location.name,
      city: snapshot.location.city,
      state: snapshot.location.state,
      lat: snapshot.location.lat,
      lon: snapshot.location.lon,
      source: snapshot.source,
      cached: snapshot.cached
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to fetch current weather",
      detail: error.message
    });
  }
};

export const getWeatherForecast = async (req, res) => {
  try {
    const forceFresh = String(req.query.force || "false").toLowerCase() === "true";
    const snapshot = await getWeatherSnapshot({
      query: req.query,
      user: req.user,
      forceFresh
    });

    await persistWeatherSnapshot({
      farmerId: req.user._id,
      cropType: getActiveCrop(req),
      snapshot
    });

    return res.status(200).json({
      location: snapshot.location.name,
      city: snapshot.location.city,
      state: snapshot.location.state,
      lat: snapshot.location.lat,
      lon: snapshot.location.lon,
      source: snapshot.source,
      cached: snapshot.cached,
      forecast: snapshot.forecast
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to fetch weather forecast",
      detail: error.message
    });
  }
};

export const getWeatherDecisionAnalysis = async (req, res) => {
  try {
    const forceFresh = String(req.query.force || "false").toLowerCase() === "true";
    const cropType = getActiveCrop(req);

    const snapshot = await getWeatherSnapshot({
      query: req.query,
      user: req.user,
      forceFresh
    });

    const analysis = await getWeatherAnalysis({
      current: snapshot.current,
      forecast: snapshot.forecast,
      cropType,
      location: snapshot.location
    });

    await persistWeatherSnapshot({
      farmerId: req.user._id,
      cropType,
      snapshot,
      analysis
    });

    const historyRecords = await WeatherData.find({
      farmerId: req.user._id,
      "location.key": snapshot.location.key
    })
      .sort({ timestamp: -1 })
      .limit(7)
      .select("temperature rainfall rainProbability timestamp createdAt")
      .lean();

    const history = buildHistoryRows({
      records: historyRecords,
      forecast: snapshot.forecast
    });

    return res.status(200).json({
      ...analysis,
      history,
      location: snapshot.location.name,
      city: snapshot.location.city,
      state: snapshot.location.state,
      source: snapshot.source,
      cached: snapshot.cached
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to generate weather analysis",
      detail: error.message
    });
  }
};
