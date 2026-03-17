import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  CalendarDays,
  ChevronRight,
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSun,
  Droplets,
  FlaskConical,
  Gauge,
  HeartPulse,
  LineChart as LineChartIcon,
  MessageSquareText,
  Minus,
  RefreshCw,
  Ruler,
  ScanLine,
  ShieldAlert,
  Siren,
  Sprout,
  Sun,
  Thermometer,
  TrendingDown,
  TrendingUp,
  Wheat,
  Wind,
  Clock3,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import AdvisoryDashboardWidget from "../../components/publicAdvisory/AdvisoryDashboardWidget.jsx";
import SchemesDashboardWidget from "../../components/schemes/SchemesDashboardWidget.jsx";

const CACHE_PREFIX = "agv:dashboard:";
const CACHE_TTL_MS = 1000 * 60 * 5;
const AI_CACHE_TTL_MS = 1000 * 60 * 2;
const runtimeCache = new Map();

const QUICK_ACTIONS = [
  {
    label: "Scan Crop Disease",
    to: "/farmer/scan",
    icon: ScanLine,
    gradient: "from-green-700 to-emerald-500",
  },
  {
    label: "Run Yield Prediction",
    to: "/farmer/predictions",
    icon: LineChartIcon,
    gradient: "from-amber-700 to-yellow-500",
  },
  {
    label: "Open Advisory Center",
    to: "/farmer/advisory",
    icon: Bot,
    gradient: "from-teal-700 to-cyan-500",
  },
  {
    label: "Check Weather",
    to: "/farmer/weather",
    icon: CloudSun,
    gradient: "from-sky-700 to-blue-500",
  },
  {
    label: "Ask AI Expert",
    to: "/farmer/advisory#ai-assistant",
    icon: MessageSquareText,
    gradient: "from-stone-700 to-amber-700",
  },
];

const FALLBACK_DASHBOARD = {
  farmProfile: {
    farmerName: "Farmer",
    location: "Nashik, Maharashtra",
    activeCrop: "Wheat",
    growthStage: "Vegetative",
    farmSizeAcres: 24.5,
    soilHealthScore: 82,
    riskLevel: "Medium",
    plantHealthScore: 86,
  },
  soilData: {
    moisture: 62,
    nitrogen: 40,
    phosphorus: 20,
    potassium: 28,
    evaporationRate: 5.1,
    nextIrrigationTime: "Within 36 hours",
  },
  weatherCurrent: {
    condition: "Partly Cloudy",
    temperature: 30,
    humidity: 58,
    rainProbability: 34,
    windSpeed: 12,
  },
  weatherForecast: [
    { day: "Today", condition: "Partly Cloudy", temperature: 30, humidity: 58, rainProbability: 34 },
    { day: "Tue", condition: "Sunny", temperature: 33, humidity: 45, rainProbability: 12 },
    { day: "Wed", condition: "Cloudy", temperature: 31, humidity: 56, rainProbability: 25 },
    { day: "Thu", condition: "Light Rain", temperature: 27, humidity: 74, rainProbability: 68 },
    { day: "Fri", condition: "Thunderstorm", temperature: 26, humidity: 82, rainProbability: 78 },
  ],
  marketPrices: [
    { crop: "Wheat", currentPrice: 2350, trend: "rising", advice: "Hold crop for 5 days" },
    { crop: "Rice", currentPrice: 3100, trend: "stable", advice: "Sell in phased lots" },
    { crop: "Tomato", currentPrice: 1800, trend: "falling", advice: "Sell immediately" },
    { crop: "Soybean", currentPrice: 4450, trend: "rising", advice: "Hold for 7 to 10 days" },
  ],
  activityTimeline: [
    {
      period: "Today",
      items: ["Irrigation applied in East block", "Leaf moisture scan completed"],
    },
    {
      period: "Yesterday",
      items: ["Nitrogen top dressing applied", "Weather risk review completed"],
    },
    {
      period: "Last week",
      items: ["AI crop health scan", "Market pricing review in mandi"],
    },
  ],
  alerts: [
    {
      title: "Heavy Rain Forecast",
      message: "Expected rain above 70mm in 48 hours. Prepare field drainage.",
      severity: "high",
    },
    {
      title: "Pest Outbreak Warning",
      message: "Whitefly pressure is increasing in nearby zones. Start field scouting.",
      severity: "medium",
    },
    {
      title: "Heatwave Alert",
      message: "Temperature likely to cross 40C next week. Shift irrigation timing.",
      severity: "high",
    },
  ],
  ai: {
    yieldPrediction: {
      expectedYield: 4.2,
      unit: "tons/acre",
      confidence: 82,
      previousSeasonYield: 3.8,
      history: [
        { week: "W-5", value: 3.6 },
        { week: "W-4", value: 3.7 },
        { week: "W-3", value: 3.9 },
        { week: "W-2", value: 4.0 },
        { week: "W-1", value: 4.1 },
        { week: "Now", value: 4.2 },
      ],
    },
    pestRisks: [
      {
        crop: "Wheat",
        risk: "Aphids",
        riskLevel: "Medium",
        confidence: 69,
        actions: ["Neem spray", "Leaf monitoring", "Yellow sticky traps"],
      },
      {
        crop: "Tomato",
        risk: "Whitefly",
        riskLevel: "Medium",
        confidence: 63,
        actions: ["Neem spray", "Monitor underside of leaves"],
      },
      {
        crop: "Rice",
        risk: "Blast Disease",
        riskLevel: "Low",
        confidence: 32,
        actions: ["Canopy monitoring", "Maintain airflow"],
      },
    ],
    irrigation: {
      soilMoistureLevel: 62,
      evaporationRate: 5.1,
      nextIrrigationTime: "Within 36 hours",
      recommendedAmountMm: 20,
      recommendation: "Recommended irrigation: 20mm within 36 hours.",
    },
    fertilizer: [
      { nutrient: "Nitrogen", amount: "40 kg/acre", applicationTime: "Today", method: "Broadcast" },
      { nutrient: "Phosphorus", amount: "20 kg/acre", applicationTime: "Tomorrow", method: "Band placement" },
      { nutrient: "Potassium", amount: "18 kg/acre", applicationTime: "In 2 days", method: "Side dressing" },
      { nutrient: "Zinc", amount: "4 kg/acre", applicationTime: "Next week", method: "Foliar spray" },
    ],
    recommendations: [
      {
        type: "Irrigation",
        title: "Irrigation recommendation",
        message: "Temperature will increase tomorrow. Light irrigation is recommended within the next 24 hours.",
      },
      {
        type: "Fertilizer",
        title: "Fertilizer suggestion",
        message: "Apply split nitrogen dose after irrigation to improve nutrient uptake efficiency.",
      },
      {
        type: "Pest Prevention",
        title: "Pest prevention advice",
        message: "High humidity pockets detected. Monitor crop leaves daily for early infestation signs.",
      },
      {
        type: "Weather Preparation",
        title: "Weather preparation",
        message: "Possible rainfall spike in two days. Clear drainage channels and pause major spraying.",
      },
    ],
  },
};

const numberOr = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeRisk = (value, fallback = "Medium") => {
  const text = String(value || fallback).toLowerCase();
  if (text.includes("high")) return "High";
  if (text.includes("low") || text.includes("safe")) return "Low";
  return "Medium";
};

const dayLabel = (dateValue, index) => {
  if (index === 0) return "Today";

  const parsed = dateValue ? new Date(dateValue) : null;
  if (parsed && !Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("en-US", { weekday: "short" });
  }

  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index % 7];
};

const weatherIconByCondition = (condition) => {
  const label = String(condition || "").toLowerCase();
  if (label.includes("thunder")) return CloudLightning;
  if (label.includes("rain") || label.includes("shower")) return CloudRain;
  if (label.includes("cloud")) return Cloud;
  if (label.includes("sun") || label.includes("clear")) return Sun;
  return CloudSun;
};

const readCache = (key, ttlMs) => {
  const cacheKey = `${CACHE_PREFIX}${key}`;

  const runtimeEntry = runtimeCache.get(cacheKey);
  if (runtimeEntry && Date.now() - runtimeEntry.timestamp < ttlMs) {
    return runtimeEntry.value;
  }

  try {
    const localEntry = window.localStorage.getItem(cacheKey);
    if (!localEntry) return null;

    const parsed = JSON.parse(localEntry);
    if (!parsed || Date.now() - parsed.timestamp >= ttlMs) return null;

    runtimeCache.set(cacheKey, parsed);
    return parsed.value;
  } catch {
    return null;
  }
};

const writeCache = (key, value) => {
  const cacheKey = `${CACHE_PREFIX}${key}`;
  const payload = { value, timestamp: Date.now() };

  runtimeCache.set(cacheKey, payload);
  try {
    window.localStorage.setItem(cacheKey, JSON.stringify(payload));
  } catch {
    // Ignore localStorage quota and privacy mode issues.
  }
};

const cachedRequest = async ({ key, request, ttlMs = CACHE_TTL_MS, force = false }) => {
  if (!force) {
    const cached = readCache(key, ttlMs);
    if (cached !== null) {
      return cached;
    }
  }

  const data = await request();
  writeCache(key, data);
  return data;
};

const requestWithFallback = async (primaryRequest, fallbackRequest) => {
  try {
    return await primaryRequest();
  } catch (error) {
    if (!fallbackRequest) {
      throw error;
    }
    return fallbackRequest();
  }
};

const extractFirstNumber = (value, fallback = 0) => {
  const match = String(value ?? "").match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return fallback;
  }

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const firstCropFromValue = (value, fallback = "") => {
  if (Array.isArray(value) && value.length > 0) {
    const item = String(value[0] || "").trim();
    return item || fallback;
  }

  const text = String(value || "").trim();
  if (!text) {
    return fallback;
  }

  return text.split(",")[0]?.trim() || fallback;
};

const unwrapPredictEnvelope = (raw) =>
  raw && typeof raw === "object" && raw.prediction && typeof raw.prediction === "object"
    ? raw.prediction
    : raw;

const normalizeFarmProfile = (raw) => ({
  farmerName: raw?.name || raw?.farmerName || FALLBACK_DASHBOARD.farmProfile.farmerName,
  location:
    raw?.location ||
    [raw?.city, raw?.state].filter(Boolean).join(", ") ||
    FALLBACK_DASHBOARD.farmProfile.location,
  activeCrop:
    raw?.activeCrop ||
    raw?.cropType ||
    firstCropFromValue(raw?.crops, FALLBACK_DASHBOARD.farmProfile.activeCrop),
  growthStage: raw?.growthStage || raw?.stage || FALLBACK_DASHBOARD.farmProfile.growthStage,
  farmSizeAcres: numberOr(raw?.farmSizeAcres ?? raw?.farmSize, FALLBACK_DASHBOARD.farmProfile.farmSizeAcres),
  soilHealthScore: clamp(
    numberOr(raw?.soilHealthScore ?? raw?.soilHealth, FALLBACK_DASHBOARD.farmProfile.soilHealthScore),
    0,
    100
  ),
  riskLevel: normalizeRisk(raw?.riskLevel, FALLBACK_DASHBOARD.farmProfile.riskLevel),
  plantHealthScore: clamp(
    numberOr(raw?.plantHealthScore, FALLBACK_DASHBOARD.farmProfile.plantHealthScore),
    0,
    100
  ),
});

const normalizeCurrentWeather = (raw) => ({
  condition: raw?.condition || raw?.weather || FALLBACK_DASHBOARD.weatherCurrent.condition,
  temperature: numberOr(raw?.temperature ?? raw?.temp, FALLBACK_DASHBOARD.weatherCurrent.temperature),
  humidity: clamp(numberOr(raw?.humidity, FALLBACK_DASHBOARD.weatherCurrent.humidity), 0, 100),
  rainProbability: clamp(
    numberOr(raw?.rainProbability ?? raw?.rainChance, FALLBACK_DASHBOARD.weatherCurrent.rainProbability),
    0,
    100
  ),
  windSpeed: numberOr(raw?.windSpeed ?? raw?.wind, FALLBACK_DASHBOARD.weatherCurrent.windSpeed),
});

const normalizeForecast = (raw) => {
  const source =
    (Array.isArray(raw) && raw) ||
    (Array.isArray(raw?.forecast) && raw.forecast) ||
    (Array.isArray(raw?.days) && raw.days) ||
    [];

  const normalized = source.slice(0, 5).map((item, index) => ({
    day: dayLabel(item?.date || item?.day, index),
    condition: item?.condition || item?.weather || item?.summary || FALLBACK_DASHBOARD.weatherForecast[index]?.condition || "Cloudy",
    temperature: numberOr(item?.temperature ?? item?.temp, FALLBACK_DASHBOARD.weatherForecast[index]?.temperature || 30),
    humidity: clamp(numberOr(item?.humidity, FALLBACK_DASHBOARD.weatherForecast[index]?.humidity || 55), 0, 100),
    rainProbability: clamp(
      numberOr(item?.rainProbability ?? item?.rainChance, FALLBACK_DASHBOARD.weatherForecast[index]?.rainProbability || 20),
      0,
      100
    ),
  }));

  if (normalized.length === 5) return normalized;

  const fallback = [...FALLBACK_DASHBOARD.weatherForecast];
  normalized.forEach((item, index) => {
    fallback[index] = item;
  });
  return fallback;
};

const normalizeMarketPrices = (raw) => {
  const source =
    (Array.isArray(raw) && raw) ||
    (Array.isArray(raw?.prices) && raw.prices) ||
    (Array.isArray(raw?.markets) && raw.markets) ||
    (Array.isArray(raw?.crops) && raw.crops) ||
    [];

  if (source.length === 0) return FALLBACK_DASHBOARD.marketPrices;

  return source.slice(0, 6).map((item, index) => {
    const fallback = FALLBACK_DASHBOARD.marketPrices[index % FALLBACK_DASHBOARD.marketPrices.length];
    const demandScore = numberOr(item?.demandScore, 55);
    const inferredTrend = demandScore >= 68 ? "rising" : demandScore <= 40 ? "falling" : "stable";
    const trend = (item?.trend || inferredTrend || fallback.trend || "stable").toLowerCase();

    const adviceByTrend = {
      rising: "Hold crop for better pricing window",
      falling: "Sell in phased lots in the next 24 to 48 hours",
      stable: "Continue planned selling schedule"
    };

    return {
      crop: item?.crop || item?.cropName || fallback.crop,
      currentPrice: numberOr(item?.currentPrice ?? item?.price ?? item?.avgPrice, fallback.currentPrice),
      trend,
      advice: item?.advice || item?.aiAdvice || adviceByTrend[trend] || fallback.advice,
    };
  });
};

const normalizeSoilData = (raw) => ({
  moisture: clamp(numberOr(raw?.moisture, FALLBACK_DASHBOARD.soilData.moisture), 0, 100),
  nitrogen: numberOr(raw?.nitrogen, FALLBACK_DASHBOARD.soilData.nitrogen),
  phosphorus: numberOr(raw?.phosphorus, FALLBACK_DASHBOARD.soilData.phosphorus),
  potassium: numberOr(raw?.potassium, FALLBACK_DASHBOARD.soilData.potassium),
  evaporationRate: numberOr(raw?.evaporationRate ?? raw?.evapotranspiration, FALLBACK_DASHBOARD.soilData.evaporationRate),
  nextIrrigationTime: raw?.nextIrrigationTime || FALLBACK_DASHBOARD.soilData.nextIrrigationTime,
});

const normalizeYieldPrediction = (raw) => {
  const fallback = FALLBACK_DASHBOARD.ai.yieldPrediction;

  const envelope = unwrapPredictEnvelope(raw);
  const expectedFromResult = extractFirstNumber(envelope?.result?.value, NaN);
  const chartHistory =
    Array.isArray(envelope?.chart?.data) && envelope.chart.data.length > 0
      ? envelope.chart.data.map((point, index) => ({
          week: point?.label || `W-${index + 1}`,
          value: numberOr(point?.value, fallback.history[index % fallback.history.length].value)
        }))
      : [];

  const history =
    (Array.isArray(raw?.history) && raw.history) ||
    (Array.isArray(raw?.trend) && raw.trend) ||
    (chartHistory.length > 0 && chartHistory) ||
    fallback.history;

  const expectedYield = numberOr(raw?.expectedYield ?? raw?.yield ?? expectedFromResult, fallback.expectedYield);
  const inferredUnit =
    String(envelope?.result?.value || "").toLowerCase().includes("hectare")
      ? "tons/hectare"
      : fallback.unit;

  return {
    expectedYield,
    unit: raw?.unit || inferredUnit,
    confidence: clamp(numberOr(raw?.confidence ?? envelope?.confidence, fallback.confidence), 0, 100),
    previousSeasonYield: numberOr(raw?.previousSeasonYield, Number((expectedYield * 0.9).toFixed(2))),
    history: history.map((point, index) => ({
      week: point?.week || point?.label || `W-${history.length - index}`,
      value: numberOr(point?.value ?? point?.yield, fallback.history[index % fallback.history.length].value),
    })),
  };
};

const normalizePestRisks = (raw, defaultCrop) => {
  const fallback = FALLBACK_DASHBOARD.ai.pestRisks;
  const envelope = unwrapPredictEnvelope(raw);

  const source =
    (Array.isArray(raw) && raw) ||
    (Array.isArray(raw?.risks) && raw.risks) ||
    (Array.isArray(raw?.predictions) && raw.predictions) ||
    [];

  if (source.length === 0) {
    if (envelope?.result?.value) {
      const [riskLevelPart, riskPart] = String(envelope.result.value)
        .split("|")
        .map((item) => String(item || "").trim());

      const likelyPestMetric = Array.isArray(envelope?.metrics)
        ? envelope.metrics.find((metric) =>
            String(metric?.label || "").toLowerCase().includes("likely pest")
          )
        : null;

      const recommendation = String(envelope?.recommendation || "").trim();

      return [
        {
          crop: defaultCrop || fallback[0].crop,
          risk: riskPart || likelyPestMetric?.value || fallback[0].risk,
          riskLevel: normalizeRisk(riskLevelPart, fallback[0].riskLevel),
          confidence: clamp(numberOr(envelope?.confidence, fallback[0].confidence), 0, 100),
          actions: recommendation ? [recommendation] : fallback[0].actions
        }
      ];
    }

    return fallback;
  }

  return source.slice(0, 4).map((item, index) => ({
    crop: item?.crop || item?.cropType || defaultCrop || fallback[index % fallback.length].crop,
    risk: item?.risk || item?.pest || item?.disease || fallback[index % fallback.length].risk,
    riskLevel: normalizeRisk(item?.riskLevel, fallback[index % fallback.length].riskLevel),
    confidence: clamp(numberOr(item?.confidence ?? item?.probability, fallback[index % fallback.length].confidence), 0, 100),
    actions:
      (Array.isArray(item?.actions) && item.actions.length > 0 && item.actions) ||
      fallback[index % fallback.length].actions,
  }));
};

const normalizeIrrigation = (raw, soilData) => {
  const fallback = FALLBACK_DASHBOARD.ai.irrigation;
  const envelope = unwrapPredictEnvelope(raw);
  const valueText = String(envelope?.result?.value || "");
  const dayMatch = valueText.match(/(\d+(?:\.\d+)?)\s*day/i);
  const amountMatch = valueText.match(/(\d+(?:\.\d+)?)\s*mm/i);

  return {
    soilMoistureLevel: clamp(
      numberOr(raw?.soilMoistureLevel ?? raw?.soilMoisture ?? soilData.moisture, fallback.soilMoistureLevel),
      0,
      100
    ),
    evaporationRate: numberOr(raw?.evaporationRate ?? soilData.evaporationRate, fallback.evaporationRate),
    nextIrrigationTime:
      raw?.nextIrrigationTime ||
      raw?.timing ||
      (dayMatch ? `Within ${Math.round(Number(dayMatch[1]))} day(s)` : null) ||
      soilData.nextIrrigationTime ||
      fallback.nextIrrigationTime,
    recommendedAmountMm: numberOr(
      raw?.recommendedAmountMm ?? raw?.amountMm ?? (amountMatch ? Number(amountMatch[1]) : NaN),
      fallback.recommendedAmountMm
    ),
    recommendation: raw?.recommendation || envelope?.recommendation || fallback.recommendation,
  };
};

const normalizeFertilizer = (raw, fallbackRows = FALLBACK_DASHBOARD.ai.fertilizer) => {
  const fallback = fallbackRows;
  const source =
    (Array.isArray(raw) && raw) ||
    (Array.isArray(raw?.rows) && raw.rows) ||
    (Array.isArray(raw?.recommendations) && raw.recommendations) ||
    [];

  if (source.length === 0) return fallback;

  return source.slice(0, 6).map((row, index) => ({
    nutrient: row?.nutrient || fallback[index % fallback.length].nutrient,
    amount: row?.amount || row?.requiredAmount || fallback[index % fallback.length].amount,
    applicationTime: row?.applicationTime || row?.time || fallback[index % fallback.length].applicationTime,
    method: row?.method || fallback[index % fallback.length].method,
  }));
};

const buildDerivedFertilizerPlan = ({ soilData, cropType }) => {
  const nitrogenNeed = clamp(Math.round((78 - soilData.nitrogen) * 0.8), 24, 52);
  const phosphorusNeed = clamp(Math.round((40 - soilData.phosphorus) * 0.7), 14, 30);
  const potassiumNeed = clamp(Math.round((52 - soilData.potassium) * 0.72), 12, 34);

  return [
    {
      nutrient: "Nitrogen",
      amount: `${nitrogenNeed} kg/acre`,
      applicationTime: "Today",
      method: "Split broadcast after light irrigation"
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
      amount: `3 kg/acre (${cropType})`,
      applicationTime: "Next week",
      method: "Foliar spray"
    }
  ];
};

const buildRecommendations = ({ irrigation, fertilizer, pestRisks, weatherCurrent }) => {
  const highestPest = [...pestRisks].sort((a, b) => b.confidence - a.confidence)[0];

  return [
    {
      type: "Irrigation",
      title: "Irrigation recommendation",
      message:
        irrigation.recommendation ||
        `Recommended irrigation: ${irrigation.recommendedAmountMm}mm within ${irrigation.nextIrrigationTime}.`,
      icon: Droplets,
      tone: "blue",
    },
    {
      type: "Fertilizer",
      title: "Fertilizer suggestion",
      message: `Prioritize ${fertilizer[0]?.nutrient || "Nitrogen"} (${fertilizer[0]?.amount || "40 kg/acre"}) ${
        fertilizer[0]?.applicationTime ? `by ${fertilizer[0].applicationTime}` : "today"
      } for balanced growth.`,
      icon: FlaskConical,
      tone: "green",
    },
    {
      type: "Pest Prevention",
      title: "Pest prevention advice",
      message:
        highestPest?.riskLevel === "High"
          ? `High ${highestPest.risk} pressure detected. Start immediate field scouting and prevention spray.`
          : `Current top risk is ${highestPest?.risk || "Aphids"}. Continue monitoring and preventive care.`,
      icon: ShieldAlert,
      tone: "amber",
    },
    {
      type: "Weather Preparation",
      title: "Weather preparation",
      message:
        weatherCurrent.rainProbability > 60
          ? "High rain probability ahead. Clear drainage and postpone major spraying operations."
          : "Weather remains manageable. Maintain regular irrigation and nutrient schedule.",
      icon: CloudSun,
      tone: "slate",
    },
  ];
};

const buildAlerts = ({ weatherCurrent, pestRisks }) => {
  const alerts = [];

  if (weatherCurrent.rainProbability >= 65) {
    alerts.push({
      title: "Heavy rain forecast",
      message: "Rain probability is high in the next 24 to 48 hours. Keep drainage lines open.",
      severity: "high",
    });
  }

  const highRisk = pestRisks.find((item) => item.riskLevel === "High");
  if (highRisk) {
    alerts.push({
      title: "Pest outbreak warning",
      message: `${highRisk.risk} risk is high for ${highRisk.crop}. Apply preventive action today.`,
      severity: "medium",
    });
  }

  if (weatherCurrent.temperature >= 38) {
    alerts.push({
      title: "Heatwave alert",
      message: "Temperature is trending high. Shift irrigation to early morning or late evening.",
      severity: "high",
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      title: "No critical alert",
      message: "Current farm conditions are stable. Continue standard crop care operations.",
      severity: "low",
    });
  }

  return alerts;
};

const GlassCard = ({ className = "", children }) => (
  <div
    className={`rounded-2xl border border-green-100/80 bg-white/70 backdrop-blur-md shadow-[0_12px_28px_-22px_rgba(20,83,45,0.6)] ${className}`}
  >
    {children}
  </div>
);

const SectionTitle = ({ icon: Icon, title, subtitle }) => (
  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h2 className="text-xl font-bold text-slate-800 inline-flex items-center gap-2">
        {Icon ? <Icon size={20} className="text-green-700" /> : null}
        {title}
      </h2>
      {subtitle ? <p className="text-sm text-slate-500 mt-1">{subtitle}</p> : null}
    </div>
  </div>
);

const SkeletonLine = ({ className = "" }) => (
  <div className={`h-3 rounded-md bg-slate-200 animate-pulse ${className}`} />
);

const DashboardSkeleton = () => (
  <div className="min-h-screen bg-linear-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef]">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 space-y-4">
        <SkeletonLine className="w-40 h-4" />
        <SkeletonLine className="w-2/3 h-8" />
        <SkeletonLine className="w-1/2 h-4" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 p-4 space-y-2">
              <SkeletonLine className="w-20 h-3" />
              <SkeletonLine className="w-28 h-6" />
              <SkeletonLine className="w-16 h-3" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <SkeletonLine className="w-48 h-5" />
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <SkeletonLine className="w-24" />
              <SkeletonLine className="h-2.5 w-full" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <SkeletonLine className="w-40 h-5" />
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-xl border border-slate-100 p-3 space-y-2">
              <SkeletonLine className="w-28" />
              <SkeletonLine className="w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const LazySection = ({ minHeightClass = "min-h-[260px]", children }) => {
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "160px" }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={sectionRef}>
      {visible ? (
        children
      ) : (
        <GlassCard className={`p-6 ${minHeightClass}`}>
          <div className="space-y-3">
            <SkeletonLine className="w-40 h-5" />
            <SkeletonLine className="w-2/3" />
            <SkeletonLine className="w-full h-2.5" />
            <SkeletonLine className="w-full h-2.5" />
            <SkeletonLine className="w-4/5 h-2.5" />
          </div>
        </GlassCard>
      )}
    </div>
  );
};

const MetricRow = ({ label, value, percent, color = "bg-green-600" }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
    <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: `${clamp(percent, 0, 100)}%` }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className={`h-full rounded-full ${color}`}
      />
    </div>
  </div>
);

const trendMeta = (trend) => {
  const normalized = String(trend || "stable").toLowerCase();
  if (normalized.includes("rise") || normalized.includes("up")) {
    return {
      icon: TrendingUp,
      className: "text-emerald-700 bg-emerald-100",
      label: "Rising",
    };
  }

  if (normalized.includes("fall") || normalized.includes("down")) {
    return {
      icon: TrendingDown,
      className: "text-red-700 bg-red-100",
      label: "Falling",
    };
  }

  return {
    icon: Minus,
    className: "text-slate-700 bg-slate-100",
    label: "Stable",
  };
};

const severityStyles = {
  high: {
    container: "bg-red-50 border-red-200",
    text: "text-red-800",
    badge: "bg-red-100 text-red-700",
    icon: AlertTriangle,
  },
  medium: {
    container: "bg-amber-50 border-amber-200",
    text: "text-amber-800",
    badge: "bg-amber-100 text-amber-700",
    icon: Siren,
  },
  low: {
    container: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-800",
    badge: "bg-emerald-100 text-emerald-700",
    icon: ShieldAlert,
  },
};

const riskBadgeStyles = {
  High: "bg-red-100 text-red-700 border-red-200",
  Medium: "bg-amber-100 text-amber-700 border-amber-200",
  Low: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const FarmerDashboard = () => {
  const { user } = useAuth();

  const [dashboard, setDashboard] = useState(FALLBACK_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  const loadDashboardData = useCallback(async ({ force = false, background = false } = {}) => {
    if (background) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [farmProfileResult, weatherCurrentResult, weatherForecastResult, marketResult, soilResult] =
        await Promise.allSettled([
          cachedRequest({
            key: "farm-profile",
            force,
            request: () =>
              requestWithFallback(
                () => api.get("/farm/profile").then((response) => response.data),
                () => api.get("/auth/me").then((response) => response.data?.user || response.data)
              )
          }),
          cachedRequest({
            key: "weather-current",
            force,
            request: () =>
              requestWithFallback(
                () => api.get("/weather/current").then((response) => response.data),
                () => Promise.resolve(FALLBACK_DASHBOARD.weatherCurrent)
              )
          }),
          cachedRequest({
            key: "weather-forecast",
            force,
            request: () =>
              requestWithFallback(
                () => api.get("/weather/forecast").then((response) => response.data),
                () => Promise.resolve(FALLBACK_DASHBOARD.weatherForecast)
              )
          }),
          cachedRequest({
            key: "market-prices",
            force,
            request: () =>
              requestWithFallback(
                () => api.get("/market/prices").then((response) => response.data),
                () => api.get("/crops/high-demand").then((response) => response.data)
              )
          }),
          cachedRequest({
            key: "soil-data",
            force,
            request: () =>
              requestWithFallback(
                () => api.get("/soil/data").then((response) => response.data),
                () => Promise.resolve(FALLBACK_DASHBOARD.soilData)
              )
          }),
        ]);

      const farmProfile = normalizeFarmProfile(
        farmProfileResult.status === "fulfilled" ? farmProfileResult.value : null
      );
      let weatherCurrent = normalizeCurrentWeather(
        weatherCurrentResult.status === "fulfilled" ? weatherCurrentResult.value : null
      );
      let weatherForecast = normalizeForecast(
        weatherForecastResult.status === "fulfilled" ? weatherForecastResult.value : null
      );
      const marketPrices = normalizeMarketPrices(
        marketResult.status === "fulfilled" ? marketResult.value : null
      );
      const soilData = normalizeSoilData(
        soilResult.status === "fulfilled" ? soilResult.value : null
      );

      const aiPayload = {
        cropType: farmProfile.activeCrop,
        soilNutrients: {
          nitrogen: soilData.nitrogen,
          phosphorus: soilData.phosphorus,
          potassium: soilData.potassium,
        },
        weatherData: {
          temperature: weatherCurrent.temperature,
          humidity: weatherCurrent.humidity,
          rainProbability: weatherCurrent.rainProbability,
        },
        farmSize: farmProfile.farmSizeAcres,
      };

      const predictPayload = {
        farmLocation: farmProfile.location,
        cropType: farmProfile.activeCrop,
        farmSizeAcres: farmProfile.farmSizeAcres,
        soilType: "Loamy",
        irrigationMethod: "Drip",
        temperature: weatherCurrent.temperature,
        rainfall: clamp(Math.round((weatherCurrent.rainProbability / 100) * 140), 20, 220),
        humidity: weatherCurrent.humidity,
        soilMoisture: soilData.moisture
      };

      const aiCacheKeySeed = `${farmProfile.activeCrop}:${soilData.moisture}:${weatherCurrent.temperature}:${weatherCurrent.humidity}`;

      const [yieldResult, pestResult, irrigationResult, fertilizerResult, weatherModelResult] = await Promise.allSettled([
        cachedRequest({
          key: `ai-yield:${aiCacheKeySeed}`,
          force,
          ttlMs: AI_CACHE_TTL_MS,
          request: () =>
            requestWithFallback(
              () => api.post("/ai/yield-prediction", aiPayload).then((response) => response.data),
              () => api.post("/predict/yield", predictPayload).then((response) => response.data)
            )
        }),
        cachedRequest({
          key: `ai-pest:${aiCacheKeySeed}`,
          force,
          ttlMs: AI_CACHE_TTL_MS,
          request: () =>
            requestWithFallback(
              () =>
                api
                  .post("/ai/pest-risk", {
                    temperature: weatherCurrent.temperature,
                    humidity: weatherCurrent.humidity,
                    cropType: farmProfile.activeCrop,
                    season: "current"
                  })
                  .then((response) => response.data),
              () => api.post("/predict/pest", predictPayload).then((response) => response.data)
            )
        }),
        cachedRequest({
          key: `ai-irrigation:${aiCacheKeySeed}`,
          force,
          ttlMs: AI_CACHE_TTL_MS,
          request: () =>
            requestWithFallback(
              () =>
                api
                  .post("/ai/irrigation", {
                    soilMoisture: soilData.moisture,
                    temperature: weatherCurrent.temperature,
                    evapotranspiration: soilData.evaporationRate
                  })
                  .then((response) => response.data),
              () => api.post("/predict/irrigation", predictPayload).then((response) => response.data)
            )
        }),
        cachedRequest({
          key: `ai-fertilizer:${aiCacheKeySeed}`,
          force,
          ttlMs: AI_CACHE_TTL_MS,
          request: () =>
            requestWithFallback(
              () => api.post("/ai/fertilizer", aiPayload).then((response) => response.data),
              () => Promise.resolve(null)
            )
        }),
        cachedRequest({
          key: `ai-weather:${aiCacheKeySeed}`,
          force,
          ttlMs: AI_CACHE_TTL_MS,
          request: () => api.post("/predict/weather", predictPayload).then((response) => response.data)
        }),
      ]);

      const weatherModelEnvelope =
        weatherModelResult.status === "fulfilled"
          ? unwrapPredictEnvelope(weatherModelResult.value)
          : null;

      const weatherRiskIndex = extractFirstNumber(weatherModelEnvelope?.result?.value, NaN);

      if (Number.isFinite(weatherRiskIndex)) {
        weatherCurrent = {
          ...weatherCurrent,
          rainProbability: clamp(Math.round(weatherRiskIndex), 0, 100),
          condition:
            weatherRiskIndex >= 72
              ? "Thunderstorm Watch"
              : weatherRiskIndex >= 48
              ? "Cloudy"
              : weatherCurrent.condition
        };
      }

      const canSynthesizeForecast =
        (!Array.isArray(weatherForecastResult.value?.forecast) &&
          !Array.isArray(weatherForecastResult.value?.days) &&
          !Array.isArray(weatherForecastResult.value)) ||
        weatherForecastResult.status !== "fulfilled";

      if (canSynthesizeForecast && Array.isArray(weatherModelEnvelope?.chart?.data)) {
        weatherForecast = weatherModelEnvelope.chart.data.slice(0, 5).map((point, index) => {
          const rainProbability = clamp(Math.round(numberOr(point?.value, weatherCurrent.rainProbability)), 0, 100);
          return {
            day: dayLabel(point?.label, index),
            condition:
              rainProbability >= 72
                ? "Thunderstorm"
                : rainProbability >= 52
                ? "Cloudy"
                : "Partly Cloudy",
            temperature: clamp(Math.round(weatherCurrent.temperature + (index - 2) * 0.8), 14, 45),
            humidity: clamp(Math.round(weatherCurrent.humidity + (rainProbability - 50) * 0.12), 20, 95),
            rainProbability
          };
        });
      }

      const aiYield = normalizeYieldPrediction(yieldResult.status === "fulfilled" ? yieldResult.value : null);
      const aiPestRisks = normalizePestRisks(
        pestResult.status === "fulfilled" ? pestResult.value : null,
        farmProfile.activeCrop
      );
      const aiIrrigation = normalizeIrrigation(
        irrigationResult.status === "fulfilled" ? irrigationResult.value : null,
        soilData
      );
      const derivedFertilizerFallback = buildDerivedFertilizerPlan({
        soilData,
        cropType: farmProfile.activeCrop
      });
      const aiFertilizer = normalizeFertilizer(
        fertilizerResult.status === "fulfilled" ? fertilizerResult.value : null,
        derivedFertilizerFallback
      );

      const activityTimeline =
        (farmProfileResult.status === "fulfilled" &&
          Array.isArray(farmProfileResult.value?.activityTimeline) &&
          farmProfileResult.value.activityTimeline.length > 0 &&
          farmProfileResult.value.activityTimeline) ||
        FALLBACK_DASHBOARD.activityTimeline;

      const recommendations = buildRecommendations({
        irrigation: aiIrrigation,
        fertilizer: aiFertilizer,
        pestRisks: aiPestRisks,
        weatherCurrent,
      });

      const alerts = buildAlerts({
        weatherCurrent,
        pestRisks: aiPestRisks,
      });

      const nextDashboard = {
        farmProfile,
        soilData,
        weatherCurrent,
        weatherForecast,
        marketPrices,
        activityTimeline,
        alerts,
        ai: {
          yieldPrediction: aiYield,
          pestRisks: aiPestRisks,
          irrigation: aiIrrigation,
          fertilizer: aiFertilizer,
          recommendations,
        },
      };

      setDashboard(nextDashboard);
      setLastSyncedAt(new Date());

      const failedCalls = [
        farmProfileResult,
        weatherCurrentResult,
        weatherForecastResult,
        marketResult,
        soilResult,
      ].filter((result) => result.status === "rejected").length;

      if (failedCalls > 0) {
        setErrorMessage("Some live services are unavailable. Displaying blended live and fallback data.");
      } else {
        setErrorMessage("");
      }
    } catch {
      setDashboard(FALLBACK_DASHBOARD);
      setErrorMessage("Unable to load live farm intelligence. Displaying fallback data.");
      setLastSyncedAt(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    const refreshTimer = setInterval(() => {
      loadDashboardData({ background: true });
    }, 1000 * 60 * 3);

    return () => clearInterval(refreshTimer);
  }, [loadDashboardData]);

  const farmerFirstName = useMemo(() => {
    const name = user?.name || dashboard.farmProfile.farmerName || "Farmer";
    return name.split(" ")[0];
  }, [dashboard.farmProfile.farmerName, user?.name]);

  const summaryCards = useMemo(
    () => [
      {
        title: "Active Crop",
        value: dashboard.farmProfile.activeCrop,
        subValue: `Stage: ${dashboard.farmProfile.growthStage}`,
        icon: Wheat,
        style: "text-green-700 bg-green-100",
      },
      {
        title: "Farm Size",
        value: `${dashboard.farmProfile.farmSizeAcres.toFixed(1)} acres`,
        subValue: dashboard.farmProfile.location,
        icon: Ruler,
        style: "text-teal-700 bg-teal-100",
      },
      {
        title: "Soil Health Score",
        value: `${dashboard.farmProfile.soilHealthScore}%`,
        subValue: "NPK + moisture balanced",
        icon: Activity,
        style: "text-amber-700 bg-amber-100",
      },
      {
        title: "Today Risk Level",
        value: dashboard.farmProfile.riskLevel,
        subValue: "AI monitored",
        icon: ShieldAlert,
        style: "text-red-700 bg-red-100",
      },
    ],
    [dashboard.farmProfile]
  );

  const weatherAdvice = useMemo(() => {
    if (dashboard.weatherCurrent.humidity >= 72) {
      return "High humidity may increase fungal disease risk. Monitor lower leaves and avoid late-evening irrigation.";
    }

    if (dashboard.weatherCurrent.rainProbability >= 60) {
      return "Rain probability is elevated. Keep field drainage ready and delay major spraying.";
    }

    return "Weather is stable for routine irrigation and nutrient application in planned windows.";
  }, [dashboard.weatherCurrent.humidity, dashboard.weatherCurrent.rainProbability]);

  const yieldComparison = useMemo(() => {
    const current = dashboard.ai.yieldPrediction.expectedYield;
    const previous = dashboard.ai.yieldPrediction.previousSeasonYield;
    if (!previous) return 0;
    return Number((((current - previous) / previous) * 100).toFixed(1));
  }, [dashboard.ai.yieldPrediction.expectedYield, dashboard.ai.yieldPrediction.previousSeasonYield]);

  const fertilizerRows = useMemo(
    () => dashboard.ai.fertilizer,
    [dashboard.ai.fertilizer]
  );

  const marketRows = useMemo(
    () => dashboard.marketPrices,
    [dashboard.marketPrices]
  );

  if (loading && !lastSyncedAt) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="relative min-h-screen bg-linear-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ x: [0, 24, 0], y: [0, -18, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-20 -top-10 h-64 w-64 rounded-full bg-green-200/35 blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -18, 0], y: [0, 16, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute right-0 top-40 h-72 w-72 rounded-full bg-lime-200/30 blur-3xl"
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <GlassCard className="p-5 sm:p-6 md:p-8 border-green-200 bg-linear-to-br from-[#11482a]/95 to-[#1a633a]/90 text-white shadow-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-xs sm:text-sm rounded-full border border-white/20 bg-white/10 px-3 py-1.5 mb-3">
                <Sprout size={14} />
                Smart Farming Command Center
              </p>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight">
                Hello {farmerFirstName}
                <br />
                <span className="text-green-100">Here is your farm intelligence for today.</span>
              </h1>
              <p className="text-sm text-green-100/90 mt-3">
                Live AI insights across crop health, irrigation, weather, pests, and market prices.
              </p>
            </div>

            <div className="flex flex-col items-start lg:items-end gap-2">
              <button
                type="button"
                onClick={() => loadDashboardData({ force: true, background: true })}
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20 transition"
              >
                <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                {refreshing ? "Refreshing" : "Refresh Data"}
              </button>
              <span className="text-xs text-green-100/90 inline-flex items-center gap-1.5">
                <Clock3 size={13} />
                Last synced: {lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : "--"}
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {summaryCards.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration: 0.35 }}
                className="rounded-2xl border border-white/15 bg-white/10 p-4 hover:bg-white/15 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-green-100/90">{card.title}</p>
                  <span className={`h-8 w-8 rounded-lg flex items-center justify-center ${card.style}`}>
                    <card.icon size={16} />
                  </span>
                </div>
                <p className="text-lg sm:text-xl font-bold mt-2 text-white">{card.value}</p>
                <p className="text-xs text-green-100/85 mt-1">{card.subValue}</p>
              </motion.div>
            ))}
          </div>
        </GlassCard>

        {errorMessage ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {errorMessage}
          </div>
        ) : null}

        {/* ── Government Schemes ── */}
        <SchemesDashboardWidget />

        <div className="grid xl:grid-cols-5 gap-6">
          <GlassCard className="xl:col-span-3 p-5 sm:p-6 space-y-5">
            <SectionTitle
              icon={HeartPulse}
              title="Smart Farm Status"
              subtitle="Real-time crop and field health indicators"
            />

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                <p className="text-slate-500">Crop Growth Stage</p>
                <p className="font-semibold text-slate-800">{dashboard.farmProfile.growthStage}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                <p className="text-slate-500">Temperature</p>
                <p className="font-semibold text-slate-800 inline-flex items-center gap-1.5">
                  <Thermometer size={14} className="text-orange-500" />
                  {dashboard.weatherCurrent.temperature}C
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                <p className="text-slate-500">Humidity</p>
                <p className="font-semibold text-slate-800 inline-flex items-center gap-1.5">
                  <Wind size={14} className="text-sky-600" />
                  {dashboard.weatherCurrent.humidity}%
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <MetricRow
                label="Soil Moisture"
                value={`${dashboard.soilData.moisture}%`}
                percent={dashboard.soilData.moisture}
                color="bg-blue-500"
              />
              <MetricRow
                label="Plant Health Score"
                value={`${dashboard.farmProfile.plantHealthScore}%`}
                percent={dashboard.farmProfile.plantHealthScore}
                color="bg-green-600"
              />
              <MetricRow
                label="Soil Health Score"
                value={`${dashboard.farmProfile.soilHealthScore}%`}
                percent={dashboard.farmProfile.soilHealthScore}
                color="bg-amber-500"
              />
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <p className="font-semibold inline-flex items-center gap-2">
                <Bot size={16} />
                AI Status Message
              </p>
              <p className="mt-1">
                Your crop health is good. Maintain current irrigation schedule and continue weekly pest scouting.
              </p>
            </div>
          </GlassCard>

          <GlassCard className="xl:col-span-2 p-5 sm:p-6 space-y-4">
            <SectionTitle
              icon={Bot}
              title="AI Farm Recommendations"
              subtitle="Prioritized suggestions generated from current farm data"
            />

            <div className="space-y-3">
              {dashboard.ai.recommendations.map((item, index) => {
                const toneClass =
                  item.tone === "blue"
                    ? "bg-blue-50 border-blue-200"
                    : item.tone === "green"
                    ? "bg-green-50 border-green-200"
                    : item.tone === "amber"
                    ? "bg-amber-50 border-amber-200"
                    : "bg-slate-50 border-slate-200";

                return (
                  <motion.div
                    key={`${item.type}-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
                    className={`rounded-xl border px-3.5 py-3 ${toneClass}`}
                  >
                    <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.message}</p>
                  </motion.div>
                );
              })}
            </div>
          </GlassCard>
        </div>

        <GlassCard className="p-5 sm:p-6 space-y-4">
          <SectionTitle
            icon={CloudSun}
            title="Weather Intelligence"
            subtitle="5-day forecast with AI weather interpretation"
          />

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {dashboard.weatherForecast.map((day) => {
              const Icon = weatherIconByCondition(day.condition);
              return (
                <motion.div
                  key={day.day}
                  whileHover={{ y: -3 }}
                  className="rounded-xl border border-slate-200 bg-white/80 px-3 py-3.5"
                >
                  <p className="text-xs font-semibold text-slate-500">{day.day}</p>
                  <Icon size={22} className="text-sky-600 mt-1" />
                  <p className="text-lg font-bold text-slate-800 mt-1">{day.temperature}C</p>
                  <p className="text-xs text-slate-500 mt-1">Humidity: {day.humidity}%</p>
                  <p className="text-xs text-slate-500">Rain: {day.rainProbability}%</p>
                </motion.div>
              );
            })}
          </div>

          <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            <p className="font-semibold">AI Weather Advice</p>
            <p className="mt-1">{weatherAdvice}</p>
          </div>
        </GlassCard>

        <LazySection minHeightClass="min-h-[420px]">
          <div className="grid xl:grid-cols-5 gap-6">
            <GlassCard className="xl:col-span-3 p-5 sm:p-6 space-y-4">
              <SectionTitle
                icon={ShieldAlert}
                title="Crop Disease Risk Monitor"
                subtitle="AI pest and disease confidence analysis"
              />

              <div className="grid md:grid-cols-2 gap-4">
                {dashboard.ai.pestRisks.map((risk, index) => (
                  <motion.article
                    key={`${risk.crop}-${risk.risk}-${index}`}
                    whileHover={{ y: -2 }}
                    className="rounded-xl border border-slate-200 bg-white/80 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs text-slate-500">Crop</p>
                        <p className="font-semibold text-slate-800">{risk.crop}</p>
                      </div>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          riskBadgeStyles[risk.riskLevel] || riskBadgeStyles.Medium
                        }`}
                      >
                        {risk.riskLevel}
                      </span>
                    </div>

                    <div className="text-sm text-slate-700">
                      <p>
                        Risk: <span className="font-semibold">{risk.risk}</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Confidence: {risk.confidence}%</p>
                    </div>

                    <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${risk.confidence}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.65 }}
                        className={`h-full ${
                          risk.riskLevel === "High"
                            ? "bg-red-500"
                            : risk.riskLevel === "Medium"
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                      />
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-600">Recommended Actions</p>
                      <ul className="mt-1 space-y-1">
                        {risk.actions.map((action) => (
                          <li key={action} className="text-xs text-slate-600 inline-flex items-start gap-1.5">
                            <ChevronRight size={12} className="mt-0.5 shrink-0" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.article>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="xl:col-span-2 p-5 sm:p-6 space-y-4">
              <SectionTitle
                icon={Gauge}
                title="AI Yield Prediction"
                subtitle="Expected output versus previous season"
              />

              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                <p className="text-xs text-green-700">Predicted Yield</p>
                <p className="text-2xl font-bold text-green-900">
                  {dashboard.ai.yieldPrediction.expectedYield.toFixed(1)} {dashboard.ai.yieldPrediction.unit}
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Confidence: {dashboard.ai.yieldPrediction.confidence}%
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5">
                  <p className="text-slate-500 text-xs">Previous Season</p>
                  <p className="font-semibold text-slate-800">
                    {dashboard.ai.yieldPrediction.previousSeasonYield.toFixed(1)} {dashboard.ai.yieldPrediction.unit}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5">
                  <p className="text-slate-500 text-xs">Season Delta</p>
                  <p className={`font-semibold ${yieldComparison >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {yieldComparison >= 0 ? "+" : ""}
                    {yieldComparison}%
                  </p>
                </div>
              </div>

              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dashboard.ai.yieldPrediction.history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" domain={["dataMin - 0.5", "dataMax + 0.5"]} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, borderColor: "#dcfce7", fontSize: "12px" }}
                      formatter={(value) => [`${value} ${dashboard.ai.yieldPrediction.unit}`, "Yield"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#16a34a"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </div>
        </LazySection>

        <LazySection minHeightClass="min-h-[360px]">
          <div className="grid xl:grid-cols-5 gap-6">
            <GlassCard className="xl:col-span-2 p-5 sm:p-6 space-y-4">
              <SectionTitle
                icon={Droplets}
                title="Smart Irrigation Monitor"
                subtitle="Moisture, evaporation and irrigation timing"
              />

              <div className="space-y-3">
                <MetricRow
                  label="Soil Moisture"
                  value={`${dashboard.ai.irrigation.soilMoistureLevel}%`}
                  percent={dashboard.ai.irrigation.soilMoistureLevel}
                  color="bg-blue-500"
                />
                <MetricRow
                  label="Evaporation Rate"
                  value={`${dashboard.ai.irrigation.evaporationRate} mm/day`}
                  percent={clamp((dashboard.ai.irrigation.evaporationRate / 8) * 100, 0, 100)}
                  color="bg-cyan-500"
                />
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                <p className="font-semibold">AI Irrigation Output</p>
                <p className="mt-1">{dashboard.ai.irrigation.recommendation}</p>
                <p className="text-xs mt-1.5 text-blue-800">
                  Next irrigation time: {dashboard.ai.irrigation.nextIrrigationTime}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
                <p className="text-xs text-slate-500 mb-2">Water Movement Indicator</p>
                <div className="h-3 rounded-full bg-sky-100 overflow-hidden relative">
                  <motion.div
                    className="absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-sky-400 via-cyan-400 to-blue-500"
                    animate={{ x: ["-20%", "260%"] }}
                    transition={{ repeat: Infinity, duration: 2.4, ease: "linear" }}
                  />
                </div>
              </div>
            </GlassCard>

            <GlassCard className="xl:col-span-3 p-5 sm:p-6 space-y-4">
              <SectionTitle
                icon={FlaskConical}
                title="Fertilizer Recommendation"
                subtitle="Nutrient plan generated from crop stage and soil analysis"
              />

              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-145">
                  <thead>
                    <tr className="bg-green-50 border-y border-green-200">
                      <th className="text-left px-4 py-2.5 font-semibold text-green-800">Nutrient</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-green-800">Required Amount</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-green-800">Application Time</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-green-800">Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fertilizerRows.map((row, index) => (
                      <tr
                        key={`${row.nutrient}-${index}`}
                        className={`border-b border-slate-100 ${index % 2 === 0 ? "bg-white/70" : "bg-slate-50/60"}`}
                      >
                        <td className="px-4 py-3 font-medium text-slate-800">{row.nutrient}</td>
                        <td className="px-4 py-3 text-slate-600">{row.amount}</td>
                        <td className="px-4 py-3 text-slate-600">{row.applicationTime}</td>
                        <td className="px-4 py-3 text-slate-600">{row.method}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Recommendation is based on crop growth stage, soil NPK profile, and upcoming weather stress.
              </div>
            </GlassCard>
          </div>
        </LazySection>

        <LazySection minHeightClass="min-h-[360px]">
          <div className="grid xl:grid-cols-5 gap-6">
            <GlassCard className="xl:col-span-3 p-5 sm:p-6 space-y-4">
              <SectionTitle
                icon={BarChart3}
                title="Market Price Intelligence"
                subtitle="Mandi trend tracking with AI selling advice"
              />

              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-155">
                  <thead>
                    <tr className="bg-slate-50 border-y border-slate-200">
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Crop</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Current Price</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Trend</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-700">AI Selling Advice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marketRows.map((row) => {
                      const meta = trendMeta(row.trend);
                      const TrendIcon = meta.icon;

                      return (
                        <tr key={`${row.crop}-${row.currentPrice}`} className="border-b border-slate-100 bg-white/70">
                          <td className="px-4 py-3 font-medium text-slate-800">{row.crop}</td>
                          <td className="px-4 py-3 font-semibold text-slate-800">Rs {row.currentPrice}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
                              <TrendIcon size={13} />
                              {meta.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{row.advice}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </GlassCard>

            <GlassCard className="xl:col-span-2 p-5 sm:p-6 space-y-4">
              <SectionTitle
                icon={CalendarDays}
                title="Farm Activity Timeline"
                subtitle="Recent field and AI workflow activities"
              />

              <div className="relative pl-4">
                <div className="absolute left-1.5 top-1 bottom-1 w-px bg-green-200" />
                <div className="space-y-4">
                  {dashboard.activityTimeline.map((entry) => (
                    <div key={entry.period} className="relative">
                      <span className="absolute -left-4 top-1 h-3 w-3 rounded-full bg-green-600" />
                      <p className="text-sm font-semibold text-slate-800">{entry.period}</p>
                      <ul className="mt-1 space-y-1">
                        {entry.items.map((item) => (
                          <li key={item} className="text-xs text-slate-600 inline-flex items-start gap-1.5">
                            <ChevronRight size={12} className="mt-0.5 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          </div>
        </LazySection>

        <LazySection minHeightClass="min-h-[260px]">
          <GlassCard className="p-5 sm:p-6 space-y-4">
            <SectionTitle
              icon={Siren}
              title="Real-Time Alerts"
              subtitle="Critical farm conditions requiring attention"
            />

            <div className="space-y-3">
              {dashboard.alerts.map((alert, index) => {
                const style = severityStyles[alert.severity] || severityStyles.medium;
                const AlertIcon = style.icon;

                return (
                  <motion.div
                    key={`${alert.title}-${index}`}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className={`rounded-xl border px-4 py-3 ${style.container}`}
                  >
                    <div className="flex items-start gap-3">
                      <AlertIcon size={18} className={`mt-0.5 shrink-0 ${style.text}`} />
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${style.text}`}>{alert.title}</p>
                        <p className="text-xs text-slate-700 mt-1">{alert.message}</p>
                      </div>
                      <span className={`text-[11px] font-semibold rounded-full px-2.5 py-1 ${style.badge}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </GlassCard>
        </LazySection>

        <LazySection minHeightClass="min-h-[220px]">
          <GlassCard className="p-5 sm:p-6 space-y-4">
            <SectionTitle
              icon={Gauge}
              title="Quick Action Center"
              subtitle="Fast shortcuts to core AI features"
            />

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
              {QUICK_ACTIONS.map((action) => (
                <motion.div key={action.label} whileHover={{ y: -4 }} whileTap={{ scale: 0.99 }}>
                  <Link
                    to={action.to}
                    className={`group relative block overflow-hidden rounded-2xl bg-linear-to-br ${action.gradient} px-4 py-4 text-white shadow-lg`}
                  >
                    <div className="absolute -right-4 -top-4 opacity-15 group-hover:opacity-25 transition-opacity">
                      <action.icon size={62} />
                    </div>
                    <action.icon size={22} className="relative z-10 mb-3" />
                    <p className="relative z-10 text-sm font-semibold leading-snug">{action.label}</p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </LazySection>

        <LazySection minHeightClass="min-h-[200px]">
          <AdvisoryDashboardWidget role="farmer" />
        </LazySection>

        
      </div>
    </div>
  );
};

export default FarmerDashboard;