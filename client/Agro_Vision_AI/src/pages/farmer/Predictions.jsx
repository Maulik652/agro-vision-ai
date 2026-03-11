import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Brain,
  ChartCandlestick,
  CloudLightning,
  Droplets,
  Download,
  Gauge,
  Leaf,
  LoaderCircle,
  MapPin,
  ShieldAlert,
  Sparkles,
  Sprout,
  TrendingUp,
  Wheat,
  Bug,
  CircleDollarSign
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { getApiErrorMessages } from "../../utils/apiError";

const MotionSection = motion.section;
const MotionDiv = motion.div;

const MODULE_ORDER = [
  "crop-health-risk",
  "yield",
  "irrigation",
  "pest",
  "market",
  "profit",
  "crop",
  "weather",
  "farm-health",
  "climate-risk"
];

const MODULE_ICONS = {
  "crop-health-risk": ShieldAlert,
  yield: Wheat,
  irrigation: Droplets,
  pest: Bug,
  market: ChartCandlestick,
  profit: CircleDollarSign,
  crop: Sprout,
  weather: CloudLightning,
  "farm-health": Gauge,
  "climate-risk": Activity
};

const AI_LOADING_STEPS = [
  "Analyzing farm conditions using AI intelligence...",
  "Running crop health and yield models...",
  "Calculating irrigation and pest outbreak signals...",
  "Forecasting market price and profitability...",
  "Building climate risk and farm health insights..."
];

const DEFAULT_FARM_DATA = {
  farmLocation: "Nashik, Maharashtra",
  cropType: "Tomato",
  farmSizeAcres: 4,
  soilType: "Loamy",
  sowingDate: "2026-02-15",
  irrigationMethod: "Drip",
  expectedHarvestDate: "2026-06-18",
  temperature: 28,
  rainfall: 92,
  humidity: 66,
  soilMoisture: 56
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const confidenceClass = (value) => {
  if (value >= 90) {
    return "bg-emerald-500";
  }

  if (value >= 80) {
    return "bg-lime-500";
  }

  if (value >= 70) {
    return "bg-amber-500";
  }

  return "bg-orange-500";
};

const toInputNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const sanitizePayload = (value) => ({
  ...value,
  farmSizeAcres: toInputNumber(value.farmSizeAcres, 2),
  temperature: toInputNumber(value.temperature, 28),
  rainfall: toInputNumber(value.rainfall, 90),
  humidity: toInputNumber(value.humidity, 65),
  soilMoisture: toInputNumber(value.soilMoisture, 55)
});

const renderChart = (chart) => {
  if (!chart || !Array.isArray(chart.data) || chart.data.length === 0) {
    return (
      <div className="h-44 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-sm text-slate-500">
        No chart data available
      </div>
    );
  }

  const type = chart.type || "line";

  if (type === "bar") {
    return (
      <div className="h-44 rounded-xl border border-slate-200 bg-white p-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart.data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey={chart.xKey || "label"} tick={{ fill: "#475569", fontSize: 11 }} />
            <YAxis tick={{ fill: "#475569", fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey={chart.yKey || "value"} fill="#16A34A" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === "area") {
    return (
      <div className="h-44 rounded-xl border border-slate-200 bg-white p-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chart.data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="predictionArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16A34A" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#16A34A" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey={chart.xKey || "label"} tick={{ fill: "#475569", fontSize: 11 }} />
            <YAxis tick={{ fill: "#475569", fontSize: 11 }} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey={chart.yKey || "value"}
              stroke="#15803D"
              fill="url(#predictionArea)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-44 rounded-xl border border-slate-200 bg-white p-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chart.data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis dataKey={chart.xKey || "label"} tick={{ fill: "#475569", fontSize: 11 }} />
          <YAxis tick={{ fill: "#475569", fontSize: 11 }} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey={chart.yKey || "value"}
            stroke="#0EA5E9"
            strokeWidth={2.3}
            dot={{ r: 2.5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const Predictions = () => {
  const [farmData, setFarmData] = useState(DEFAULT_FARM_DATA);
  const [predictions, setPredictions] = useState({});
  const [summary, setSummary] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    if (!isGenerating) {
      return undefined;
    }

    const timer = setInterval(() => {
      setLoadingStep((previous) => (previous + 1) % AI_LOADING_STEPS.length);
    }, 900);

    return () => clearInterval(timer);
  }, [isGenerating]);

  const predictionList = useMemo(() => {
    return MODULE_ORDER
      .map((key) => predictions[key])
      .filter(Boolean);
  }, [predictions]);

  const averageConfidence = useMemo(() => {
    if (predictionList.length === 0) {
      return 0;
    }

    const total = predictionList.reduce((sum, item) => sum + (Number(item.confidence) || 0), 0);
    return Math.round(total / predictionList.length);
  }, [predictionList]);

  const bestModule = useMemo(() => {
    if (predictionList.length === 0) {
      return null;
    }

    return [...predictionList].sort((left, right) => (right.confidence || 0) - (left.confidence || 0))[0];
  }, [predictionList]);

  const handleInput = (event) => {
    const { name, value } = event.target;
    setFarmData((previous) => ({ ...previous, [name]: value }));
  };

  const generatePredictions = async () => {
    const payload = sanitizePayload(farmData);

    setIsGenerating(true);
    setLoadingStep(0);

    try {
      const response = await api.post("/predict/all", payload);
      const nextPredictions = response.data?.predictions || {};
      const nextSummary = response.data?.summary || null;

      setPredictions(nextPredictions);
      setSummary(nextSummary);

      toast.success("AI predictions generated successfully.");
    } catch (error) {
      const messages = getApiErrorMessages(error, "Unable to generate AI predictions");
      toast.error(messages[0]);
    } finally {
      setIsGenerating(false);
    }
  };

  const exportReport = async () => {
    if (predictionList.length === 0) {
      toast.error("Generate predictions before exporting report.");
      return;
    }

    setIsExporting(true);

    try {
      const response = await api.post(
        "/predict/report",
        {
          farmData: sanitizePayload(farmData),
          predictions,
          summary
        },
        {
          responseType: "blob"
        }
      );

      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const anchor = document.createElement("a");

      anchor.href = blobUrl;
      anchor.download = `ai-farm-prediction-report-${Date.now()}.pdf`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(blobUrl);

      toast.success("Prediction report exported.");
    } catch (error) {
      const messages = getApiErrorMessages(error, "Unable to export prediction report");
      toast.error(messages[0]);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-linear-to-b from-[#F0FFF4] via-[#F8FFFB] to-[#FFFDF5]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <MotionDiv
          animate={{ x: [0, 20, 0], y: [0, -16, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-12 top-8 h-64 w-64 rounded-full bg-emerald-200/45 blur-3xl"
        />
        <MotionDiv
          animate={{ x: [0, -22, 0], y: [0, 18, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="absolute right-0 top-44 h-64 w-64 rounded-full bg-lime-200/40 blur-3xl"
        />
        <MotionDiv
          animate={{ x: [0, 14, 0], y: [0, 20, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-0 left-1/3 h-60 w-60 rounded-full bg-amber-100/45 blur-3xl"
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        <MotionSection
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="rounded-3xl border border-emerald-300/45 bg-linear-to-r from-[#064E3B] via-[#0F766E] to-[#15803D] text-white p-6 sm:p-8 shadow-xl"
        >
          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="space-y-4">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs sm:text-sm">
                <Sparkles size={14} />
                Advanced AI Agriculture Intelligence
              </p>

              <h1
                className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight"
                style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
              >
                AI Farm Intelligence Prediction Center
              </h1>

              <p className="text-sm sm:text-base text-emerald-50 max-w-2xl">
                Use AI to predict crop yield, irrigation needs, pest risks, market prices, profits, and climate impact
                with farmer-friendly recommendations and explainable confidence signals.
              </p>

              <div className="flex flex-wrap gap-2">
                <StatBadge label="AI Prediction Accuracy" value={`${summary?.accuracy || 92}%`} />
                <StatBadge label="Predictions Generated" value={`${summary?.generatedCount || 18000}+`} />
                <StatBadge label="Farmers Supported" value={`${summary?.farmersSupported || 3500}+`} />
              </div>
            </div>

            <div className="rounded-2xl border border-white/25 bg-white/10 p-4 sm:p-5 space-y-4 backdrop-blur-sm">
              <p className="text-sm font-semibold inline-flex items-center gap-2">
                <Brain size={16} />
                AI System Pulse
              </p>

              <div className="rounded-xl border border-white/20 bg-black/10 p-3">
                <p className="text-xs text-emerald-100">Live Confidence Index</p>
                <p className="mt-1 text-2xl font-bold">{averageConfidence || 92}%</p>
                <div className="mt-2 h-2 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-lime-300 via-emerald-300 to-yellow-300"
                    style={{ width: `${clamp(averageConfidence || 92, 10, 100)}%` }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-white/20 bg-black/10 p-3">
                <p className="text-xs text-emerald-100">Top Reliable Module</p>
                <p className="mt-1 text-sm font-semibold">{bestModule?.title || "Yield Prediction"}</p>
                <p className="text-xs text-emerald-100 mt-1">Confidence {bestModule?.confidence ?? 91}%</p>
              </div>

              <p className="text-xs text-emerald-100 inline-flex items-center gap-1.5">
                <Leaf size={13} />
                Optimized for farmer-first decision support.
              </p>
            </div>
          </div>
        </MotionSection>

        <MotionSection
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.45 }}
          className="rounded-3xl border border-slate-200 bg-white/90 p-5 sm:p-6 shadow-lg"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 inline-flex items-center gap-2">
              <MapPin size={18} className="text-emerald-700" />
              Farm Data Input Panel
            </h2>

            <button
              type="button"
              onClick={exportReport}
              disabled={isExporting || predictionList.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isExporting ? <LoaderCircle size={15} className="animate-spin" /> : <Download size={15} />}
              Export Prediction Report
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <InputField label="Farm Location" name="farmLocation" value={farmData.farmLocation} onChange={handleInput} />

            <SelectField
              label="Crop Type"
              name="cropType"
              value={farmData.cropType}
              onChange={handleInput}
              options={["Tomato", "Rice", "Wheat", "Cotton", "Maize", "Soybean", "Groundnut"]}
            />

            <InputField label="Farm Size (Acres)" name="farmSizeAcres" value={farmData.farmSizeAcres} type="number" onChange={handleInput} />

            <SelectField
              label="Soil Type"
              name="soilType"
              value={farmData.soilType}
              onChange={handleInput}
              options={["Loamy", "Clay", "Sandy", "Silty", "Black", "Red", "Laterite"]}
            />

            <InputField label="Sowing Date" name="sowingDate" value={farmData.sowingDate} type="date" onChange={handleInput} />

            <SelectField
              label="Irrigation Method"
              name="irrigationMethod"
              value={farmData.irrigationMethod}
              onChange={handleInput}
              options={["Drip", "Sprinkler", "Flood", "Rainfed", "Furrow"]}
            />

            <InputField
              label="Expected Harvest Date"
              name="expectedHarvestDate"
              value={farmData.expectedHarvestDate}
              type="date"
              onChange={handleInput}
            />

            <InputField
              label="Temperature (deg C)"
              name="temperature"
              value={farmData.temperature}
              type="number"
              onChange={handleInput}
            />

            <InputField label="Rainfall (mm)" name="rainfall" value={farmData.rainfall} type="number" onChange={handleInput} />

            <InputField label="Humidity (%)" name="humidity" value={farmData.humidity} type="number" onChange={handleInput} />

            <InputField label="Soil Moisture (%)" name="soilMoisture" value={farmData.soilMoisture} type="number" onChange={handleInput} />
          </div>

          <button
            type="button"
            onClick={generatePredictions}
            disabled={isGenerating}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-emerald-700 to-green-600 px-5 py-3 text-sm font-semibold text-white hover:from-emerald-800 hover:to-green-700 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isGenerating ? <LoaderCircle size={16} className="animate-spin" /> : <Brain size={16} />}
            {isGenerating ? "Generating AI Predictions..." : "Generate AI Predictions"}
          </button>

          {isGenerating && (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-900 inline-flex items-center gap-2">
                <LoaderCircle size={16} className="animate-spin" />
                {AI_LOADING_STEPS[loadingStep]}
              </p>
            </div>
          )}
        </MotionSection>

        {predictionList.length > 0 && (
          <MotionSection
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.45 }}
            className="space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 inline-flex items-center gap-2">
                <TrendingUp size={20} className="text-emerald-700" />
                AI Prediction Dashboard
              </h2>

              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                <Sparkles size={15} className="text-amber-500" />
                {summary?.engineMode === "python" ? "Python ML Engine Active" : "Hybrid AI Engine Active"}
              </div>
            </div>

            <div className="grid xl:grid-cols-2 gap-4">
              {predictionList.map((item, index) => (
                <PredictionCard key={item.key || index} item={item} index={index} />
              ))}
            </div>
          </MotionSection>
        )}
      </div>
    </div>
  );
};

const InputField = ({ label, ...props }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-semibold text-slate-700">{label}</span>
    <input
      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-300"
      {...props}
    />
  </label>
);

const SelectField = ({ label, options, ...props }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-semibold text-slate-700">{label}</span>
    <select
      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-300"
      {...props}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </label>
);

const StatBadge = ({ label, value }) => (
  <div className="rounded-xl border border-white/25 bg-white/10 px-3 py-2">
    <p className="text-[11px] uppercase tracking-wide text-emerald-100">{label}</p>
    <p className="text-sm font-semibold">{value}</p>
  </div>
);

const PredictionCard = ({ item, index }) => {
  const Icon = MODULE_ICONS[item.key] || Brain;
  const confidence = Number(item.confidence || 0);

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.03 * (index + 1), duration: 0.4 }}
      className="rounded-3xl border border-slate-200 bg-white/95 p-4 sm:p-5 shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Prediction Module</p>
          <h3 className="mt-1 text-base sm:text-lg font-bold text-slate-900">{item.title}</h3>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-emerald-700">
          <Icon size={18} />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <p className="text-xs text-slate-500">{item.result?.label || "Prediction"}</p>
        <p className="mt-1 text-lg font-bold text-slate-900">{item.result?.value || "-"}</p>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between gap-2 text-xs sm:text-sm">
          <span className="font-medium text-slate-700">AI Confidence Meter</span>
          <span className="font-semibold text-slate-900">{confidence}% ({item.confidenceBand || "Medium"})</span>
        </div>
        <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${confidenceClass(confidence)}`}
            style={{ width: `${clamp(confidence, 3, 100)}%` }}
          />
        </div>
      </div>

      <div className="mt-4">{renderChart(item.chart)}</div>

      <div className="mt-4 grid sm:grid-cols-3 gap-2 text-xs">
        {(item.metrics || []).slice(0, 3).map((metric) => (
          <div key={metric.label} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
            <p className="text-slate-500">{metric.label}</p>
            <p className="font-semibold text-slate-800 mt-0.5">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
        <p className="text-xs font-semibold text-emerald-800">Smart AI Recommendation</p>
        <p className="mt-1 text-sm text-emerald-900">{item.recommendation}</p>
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <p className="text-xs font-semibold text-slate-700">Farmer-Friendly Explanation</p>
        <p className="mt-1 text-sm text-slate-700">{item.explanation}</p>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <Brain size={12} />
          {item.model?.name || "AI Model"}
        </span>
        <span className="inline-flex items-center gap-1">
          {confidence >= 80 ? <ArrowUpRight size={12} className="text-emerald-600" /> : <ArrowDownRight size={12} className="text-orange-600" />}
          {item.model?.family || "Prediction Engine"}
        </span>
      </div>
    </MotionDiv>
  );
};

export default Predictions;