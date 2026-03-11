// src/pages/farmer/Advisory.jsx
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Leaf,
  Droplets,
  Thermometer,
  Wind,
  Sun,
  CloudRain,
  Cloud,
  CloudSun,
  CloudLightning,
  Bug,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Activity,
  BarChart3,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Send,
  ScanLine,
  LineChart,
  CloudDrizzle,
  Sprout,
  Wheat,
  FlaskConical,
  Landmark,
  MessageSquare,
  AlertTriangle,
  Bell,
  CircleGauge,
  Gauge,
  Zap,
  ChevronRight,
  Bot,
  User,
  Search,
  ExternalLink,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ═══════════════════════════════════════════════════════
   MOCK DATA — structured like real API responses so
   swapping to live endpoints is a single-line change.
   ═══════════════════════════════════════════════════════ */

const overviewStats = [
  { label: "Active Crop", value: "Wheat", icon: Wheat, color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
  { label: "Soil Health Score", value: "82/100", icon: Activity, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  { label: "Weather Condition", value: "Partly Cloudy", icon: CloudSun, color: "text-sky-600", bg: "bg-sky-50", border: "border-sky-200" },
  { label: "Risk Level", value: "Low", icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
];

const farmData = {
  cropType: "Wheat (HD-2967)",
  growthStage: "Tillering",
  soilMoisture: 64,
  temperature: 28,
  humidity: 52,
  recommendation:
    "Based on current soil moisture at 64% and upcoming temperature rise to 34°C, light irrigation of 15-18 mm is recommended within the next 24 hours. Delay nitrogen top-dressing until post-irrigation for optimal uptake.",
  riskLevel: "moderate",
};

const weatherData = [
  { day: "Today", icon: "sun", temp: 28, humidity: 52, wind: 12 },
  { day: "Tue", icon: "cloud-sun", temp: 30, humidity: 48, wind: 10 },
  { day: "Wed", icon: "cloud", temp: 32, humidity: 55, wind: 8 },
  { day: "Thu", icon: "cloud-rain", temp: 26, humidity: 72, wind: 15 },
  { day: "Fri", icon: "cloud-lightning", temp: 24, humidity: 80, wind: 20 },
];

const weatherAdvice =
  "High humidity forecasted on Thursday-Friday may increase fungal disease risk, especially Karnal Bunt in wheat. Apply preventive fungicide spray before Thursday and monitor crop leaves carefully.";

const pestAlerts = [
  {
    crop: "Wheat",
    pest: "Aphids",
    risk: "high",
    probability: 78,
    actions: ["Apply imidacloprid spray", "Release lady beetles", "Monitor new growth shoots"],
  },
  {
    crop: "Tomato",
    pest: "Whitefly",
    risk: "medium",
    probability: 55,
    actions: ["Neem oil spray", "Monitor leaf underside", "Use yellow sticky traps"],
  },
  {
    crop: "Rice",
    pest: "Stem Borer",
    risk: "low",
    probability: 22,
    actions: ["Light trap installation", "Remove affected tillers", "Maintain field hygiene"],
  },
];

const irrigationData = {
  soilMoisture: 64,
  temperature: 28,
  evaporationRate: 5.2,
  recommendation: "Recommended irrigation: 18–22 mm within the next 48 hours. Drip irrigation preferred to reduce water loss by 30%.",
};

const fertilizerData = [
  { nutrient: "Nitrogen (N)", qty: "40 kg/acre", time: "Today", method: "Broadcast" },
  { nutrient: "Phosphorus (P)", qty: "25 kg/acre", time: "Next Week", method: "Band Placement" },
  { nutrient: "Potassium (K)", qty: "20 kg/acre", time: "In 10 Days", method: "Side Dressing" },
  { nutrient: "Zinc (Zn)", qty: "5 kg/acre", time: "At Sowing", method: "Soil Application" },
];

const marketData = [
  { crop: "Wheat", price: "₹2,350/qtl", trend: "rising", advice: "Hold crop for 5–7 days" },
  { crop: "Rice", price: "₹3,100/qtl", trend: "stable", advice: "Sell in current window" },
  { crop: "Tomato", price: "₹1,800/qtl", trend: "falling", advice: "Sell immediately" },
  { crop: "Soybean", price: "₹4,450/qtl", trend: "rising", advice: "Hold for 10 days" },
];

const priceTrendChartData = [
  { name: "Week 1", wheat: 2100, rice: 2900, tomato: 2200 },
  { name: "Week 2", wheat: 2180, rice: 2950, tomato: 2050 },
  { name: "Week 3", wheat: 2220, rice: 3000, tomato: 1950 },
  { name: "Week 4", wheat: 2350, rice: 3100, tomato: 1800 },
];

const governmentSchemes = [
  {
    name: "PM-KISAN",
    desc: "Direct income support of ₹6,000 per year to eligible farmer families in 3 installments.",
    benefit: "₹6,000/year",
    link: "#",
  },
  {
    name: "PMFBY — Crop Insurance",
    desc: "Comprehensive crop insurance against natural calamities, pests, and diseases at minimal premium.",
    benefit: "Up to ₹2,00,000",
    link: "#",
  },
  {
    name: "Soil Health Card",
    desc: "Free soil testing and nutrient-based crop recommendations to improve soil health.",
    benefit: "Free Testing",
    link: "#",
  },
  {
    name: "PM-KUSUM Solar Pump",
    desc: "Subsidy for solar-powered irrigation pumps reducing electricity costs for farmers.",
    benefit: "60% Subsidy",
    link: "#",
  },
];

const criticalAlerts = [
  { title: "Heavy Rain Warning", desc: "IMD predicts 80mm rainfall on Thursday. Ensure drainage is clear.", severity: "high" },
  { title: "Pest Outbreak Risk", desc: "Aphid population increase detected in your district. Inspect crops daily.", severity: "medium" },
  { title: "Heatwave Alert", desc: "Temperatures may exceed 42°C next week. Irrigate early morning or late evening.", severity: "high" },
];

const quickActions = [
  { label: "Scan Crop Disease", icon: ScanLine, path: "/farmer/scan", color: "from-green-600 to-emerald-500" },
  { label: "Run Yield Prediction", icon: LineChart, path: "/farmer/predictions", color: "from-amber-600 to-yellow-500" },
  { label: "Check Weather Forecast", icon: CloudDrizzle, path: "/farmer/weather", color: "from-sky-600 to-blue-500" },
  { label: "View Market Prices", icon: BarChart3, path: "/farmer/marketplace", color: "from-purple-600 to-fuchsia-500" },
  { label: "Ask AI Expert", icon: Bot, path: "#ai-assistant", color: "from-teal-600 to-cyan-500" },
];

const sampleBotResponses = {
  "my cotton leaves are turning yellow":
    "Possible nitrogen deficiency detected. Apply 30 kg/acre urea immediately and ensure irrigation levels are maintained at 60-70% soil moisture. Also check for magnesium deficiency if yellowing appears between leaf veins.",
  "when should i harvest wheat":
    "Wheat should be harvested when grain moisture drops to 12-14%. Check for golden-brown color of ears and hardness of grain by biting test. Based on your sowing date, estimated harvest window is 2nd–3rd week of April.",
  default:
    "I've analyzed your query. Based on current farm conditions and AI models, I recommend consulting the relevant advisory section above or providing more specific details about your crop, soil, or weather concern for a precise recommendation.",
};

/* ───── Helpers ───── */

const WEATHER_ICONS = {
  sun: Sun,
  "cloud-sun": CloudSun,
  cloud: Cloud,
  "cloud-rain": CloudRain,
  "cloud-lightning": CloudLightning,
};

const riskColor = (level) => {
  const l = level?.toLowerCase();
  if (l === "high") return { text: "text-red-600", bg: "bg-red-50", border: "border-red-200", badge: "bg-red-100 text-red-700" };
  if (l === "medium") return { text: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700" };
  return { text: "text-green-600", bg: "bg-green-50", border: "border-green-200", badge: "bg-green-100 text-green-700" };
};

const trendIcon = (trend) => {
  if (trend === "rising") return <TrendingUp size={16} className="text-green-600" />;
  if (trend === "falling") return <TrendingDown size={16} className="text-red-500" />;
  return <ArrowRight size={16} className="text-slate-500" />;
};

/* ───── Reusable section wrapper ───── */
const Section = ({ id, icon: Icon, title, children }) => (
  <motion.section
    id={id}
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-60px" }}
    transition={{ duration: 0.5 }}
    className="space-y-5"
  >
    <div className="flex items-center gap-3">
      {Icon && <Icon size={22} className="text-green-700" />}
      <h2 className="text-xl md:text-2xl font-bold text-slate-800">{title}</h2>
    </div>
    {children}
  </motion.section>
);

/* ───── Glass card ───── */
const GlassCard = ({ children, className = "", hover = true, ...rest }) => (
  <div
    className={`rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-md shadow-sm ${hover ? "hover:shadow-lg hover:-translate-y-1 transition-all duration-300" : ""} ${className}`}
    {...rest}
  >
    {children}
  </div>
);

/* ───── Progress bar ───── */
const ProgressBar = ({ value, max = 100, color = "bg-green-500" }) => (
  <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
    <motion.div
      className={`h-full rounded-full ${color}`}
      initial={{ width: 0 }}
      whileInView={{ width: `${Math.min((value / max) * 100, 100)}%` }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    />
  </div>
);

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */

const Advisory = () => {
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  /* ── AI chat handler (mock) ── */
  const handleAskAI = () => {
    const q = chatInput.trim();
    if (!q) return;

    setChatHistory((prev) => [...prev, { role: "user", text: q }]);
    setChatInput("");
    setIsTyping(true);

    // Simulate AI response delay
    setTimeout(() => {
      const key = Object.keys(sampleBotResponses).find((k) =>
        q.toLowerCase().includes(k)
      );
      setChatHistory((prev) => [
        ...prev,
        { role: "ai", text: sampleBotResponses[key] || sampleBotResponses.default },
      ]);
      setIsTyping(false);
    }, 1200);
  };

  /* ── Memoised totals ── */
  const activeAlertCount = useMemo(
    () => criticalAlerts.filter((a) => a.severity === "high").length,
    []
  );

  /* ═══════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-linear-to-br from-[#f8faf5] via-[#f0fdf4] to-[#f5f5f0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-14">

        {/* ═══════════════════════════════════════════
            1. SMART ADVISORY HEADER
        ═══════════════════════════════════════════ */}
        <header className="space-y-6">
          <div className="text-center space-y-2">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-800"
            >
              Smart Farming Advisory Center
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-slate-500 text-base sm:text-lg max-w-2xl mx-auto"
            >
              AI-powered crop recommendations, weather insights, and farming intelligence — all in one place.
            </motion.p>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {overviewStats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 * i }}
              >
                <GlassCard className={`p-4 ${s.bg} ${s.border}`}>
                  <div className="flex items-center gap-3">
                    <s.icon size={20} className={s.color} />
                    <div>
                      <p className="text-xs text-slate-500 leading-none">{s.label}</p>
                      <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </header>

        {/* ═══════════════════════════════════════════
            2. PERSONALIZED FARM ADVISORY PANEL
        ═══════════════════════════════════════════ */}
        <Section icon={Sprout} title="Personalized Farm Advisory">
          <GlassCard className="p-6 space-y-6" hover={false}>
            {/* Farm overview grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {[
                { label: "Crop Type", value: farmData.cropType, icon: Wheat, color: "text-green-600" },
                { label: "Growth Stage", value: farmData.growthStage, icon: Sprout, color: "text-emerald-600" },
                { label: "Soil Moisture", value: `${farmData.soilMoisture}%`, icon: Droplets, color: "text-blue-600" },
                { label: "Temperature", value: `${farmData.temperature}°C`, icon: Thermometer, color: "text-orange-500" },
                { label: "Humidity", value: `${farmData.humidity}%`, icon: Wind, color: "text-sky-500" },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-2">
                  <item.icon size={18} className={`${item.color} mt-0.5 shrink-0`} />
                  <div>
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <p className="text-sm font-semibold text-slate-800">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Risk badge + Soil moisture bar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${riskColor(farmData.riskLevel).badge}`}>
                <ShieldQuestion size={14} />
                Risk: {farmData.riskLevel.charAt(0).toUpperCase() + farmData.riskLevel.slice(1)}
              </span>
              <div className="flex-1 space-y-1">
                <p className="text-xs text-slate-500">Soil Moisture</p>
                <ProgressBar value={farmData.soilMoisture} color="bg-blue-500" />
              </div>
            </div>

            {/* AI Recommendation */}
            <div className="rounded-xl bg-green-50 border border-green-200 p-4 flex gap-3">
              <Bot size={22} className="text-green-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-green-800 mb-1">AI Recommendation</p>
                <p className="text-sm text-green-900 leading-relaxed">{farmData.recommendation}</p>
              </div>
            </div>
          </GlassCard>
        </Section>

        {/* ═══════════════════════════════════════════
            3. WEATHER-BASED FARMING ADVICE
        ═══════════════════════════════════════════ */}
        <Section icon={CloudSun} title="Weather Intelligence">
          {/* 5-day forecast cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {weatherData.map((d, i) => {
              const WIcon = WEATHER_ICONS[d.icon] || Cloud;
              return (
                <motion.div
                  key={d.day}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.08 * i }}
                >
                  <GlassCard className="p-4 text-center space-y-2">
                    <p className="text-xs font-semibold text-slate-500">{d.day}</p>
                    <WIcon size={28} className="mx-auto text-sky-500" />
                    <p className="text-lg font-bold text-slate-800">{d.temp}°C</p>
                    <div className="flex justify-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-0.5"><Droplets size={12} />{d.humidity}%</span>
                      <span className="flex items-center gap-0.5"><Wind size={12} />{d.wind}km/h</span>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>

          {/* AI Weather Advice */}
          <GlassCard className="p-4 flex gap-3 border-sky-200 bg-sky-50/60" hover={false}>
            <CloudRain size={22} className="text-sky-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-sky-800 mb-1">AI Weather Advice</p>
              <p className="text-sm text-sky-900 leading-relaxed">{weatherAdvice}</p>
            </div>
          </GlassCard>
        </Section>

        {/* ═══════════════════════════════════════════
            4. PEST & DISEASE ADVISORY
        ═══════════════════════════════════════════ */}
        <Section icon={Bug} title="Crop Protection Alert System">
          <div className="grid md:grid-cols-3 gap-5">
            {pestAlerts.map((alert) => {
              const rc = riskColor(alert.risk);
              return (
                <GlassCard key={alert.pest} className={`p-5 space-y-4 ${rc.bg} ${rc.border}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500">Crop</p>
                      <p className="font-semibold text-slate-800">{alert.crop}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${rc.badge}`}>
                      {alert.risk.charAt(0).toUpperCase() + alert.risk.slice(1)} Risk
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bug size={16} className={rc.text} />
                      <span className="text-sm font-medium text-slate-700">{alert.pest}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <CircleGauge size={14} />
                      {alert.probability}% probability
                    </div>
                  </div>

                  {/* Progress indicator */}
                  <ProgressBar
                    value={alert.probability}
                    color={
                      alert.risk === "high"
                        ? "bg-red-500"
                        : alert.risk === "medium"
                        ? "bg-amber-500"
                        : "bg-green-500"
                    }
                  />

                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-2">Recommended Actions</p>
                    <ul className="space-y-1">
                      {alert.actions.map((a) => (
                        <li key={a} className="flex items-start gap-2 text-xs text-slate-700">
                          <ChevronRight size={12} className="mt-0.5 shrink-0" />
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </Section>

        {/* ═══════════════════════════════════════════
            5. SMART IRRIGATION ADVISOR
        ═══════════════════════════════════════════ */}
        <Section icon={Droplets} title="AI Irrigation Guide">
          <GlassCard className="p-6 space-y-5" hover={false}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                { label: "Soil Moisture Level", value: `${irrigationData.soilMoisture}%`, icon: Droplets, color: "bg-blue-500", pct: irrigationData.soilMoisture },
                { label: "Temperature", value: `${irrigationData.temperature}°C`, icon: Thermometer, color: "bg-orange-500", pct: (irrigationData.temperature / 50) * 100 },
                { label: "Evaporation Rate", value: `${irrigationData.evaporationRate} mm/day`, icon: Sun, color: "bg-amber-500", pct: (irrigationData.evaporationRate / 10) * 100 },
              ].map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <item.icon size={16} className="text-slate-600" />
                    <span className="text-xs text-slate-500">{item.label}</span>
                  </div>
                  <p className="text-lg font-bold text-slate-800">{item.value}</p>
                  <ProgressBar value={item.pct} color={item.color} />
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 flex gap-3">
              <Droplets size={22} className="text-blue-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-blue-800 mb-1">AI Irrigation Output</p>
                <p className="text-sm text-blue-900 leading-relaxed">{irrigationData.recommendation}</p>
              </div>
            </div>
          </GlassCard>
        </Section>

        {/* ═══════════════════════════════════════════
            6. FERTILIZER RECOMMENDATION ENGINE
        ═══════════════════════════════════════════ */}
        <Section icon={FlaskConical} title="Nutrient Advisory">
          <GlassCard className="overflow-hidden" hover={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-green-50 border-b border-green-200">
                    <th className="text-left px-5 py-3 font-semibold text-green-800">Nutrient</th>
                    <th className="text-left px-5 py-3 font-semibold text-green-800">Recommended Qty</th>
                    <th className="text-left px-5 py-3 font-semibold text-green-800">Application Time</th>
                    <th className="text-left px-5 py-3 font-semibold text-green-800">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {fertilizerData.map((f, i) => (
                    <tr key={f.nutrient} className={`border-b border-slate-100 ${i % 2 === 0 ? "bg-white/60" : "bg-slate-50/40"}`}>
                      <td className="px-5 py-3 font-medium text-slate-800">{f.nutrient}</td>
                      <td className="px-5 py-3 text-slate-600">{f.qty}</td>
                      <td className="px-5 py-3 text-slate-600">{f.time}</td>
                      <td className="px-5 py-3 text-slate-600">{f.method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 bg-amber-50 border-t border-amber-200 flex gap-2 items-start">
              <FlaskConical size={16} className="text-amber-700 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800">Recommendation based on current crop stage analysis and soil nutrient testing data.</p>
            </div>
          </GlassCard>
        </Section>

        {/* ═══════════════════════════════════════════
            7. CROP MARKET INTELLIGENCE
        ═══════════════════════════════════════════ */}
        <Section icon={BarChart3} title="Market Price Trends">
          {/* Chart */}
          <GlassCard className="p-5" hover={false}>
            <p className="text-xs text-slate-500 mb-3 font-medium">4-Week Price Movement (₹/qtl)</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={priceTrendChartData}>
                <defs>
                  <linearGradient id="gWheat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16a34a" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gRice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gTomato" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#dc2626" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#dc2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px", border: "1px solid #e2e8f0" }} />
                <Area type="monotone" dataKey="wheat" stroke="#16a34a" fill="url(#gWheat)" strokeWidth={2} name="Wheat" />
                <Area type="monotone" dataKey="rice" stroke="#0284c7" fill="url(#gRice)" strokeWidth={2} name="Rice" />
                <Area type="monotone" dataKey="tomato" stroke="#dc2626" fill="url(#gTomato)" strokeWidth={2} name="Tomato" />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* Market table */}
          <GlassCard className="overflow-hidden" hover={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-5 py-3 font-semibold text-slate-700">Crop</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-700">Current Price</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-700">Trend</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-700">AI Selling Advice</th>
                  </tr>
                </thead>
                <tbody>
                  {marketData.map((m, i) => (
                    <tr key={m.crop} className={`border-b border-slate-100 ${i % 2 === 0 ? "bg-white/60" : "bg-slate-50/40"}`}>
                      <td className="px-5 py-3 font-medium text-slate-800">{m.crop}</td>
                      <td className="px-5 py-3 font-semibold text-slate-800">{m.price}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1 text-xs font-medium capitalize">
                          {trendIcon(m.trend)} {m.trend}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{m.advice}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </Section>

        {/* ═══════════════════════════════════════════
            8. GOVERNMENT SCHEME UPDATES
        ═══════════════════════════════════════════ */}
        <Section icon={Landmark} title="Farmer Support Programs">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {governmentSchemes.map((s, i) => (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * i }}
              >
                <GlassCard className="p-5 flex flex-col h-full">
                  <Landmark size={20} className="text-green-700 mb-3" />
                  <h3 className="font-semibold text-slate-800 mb-1">{s.name}</h3>
                  <p className="text-xs text-slate-500 flex-1 mb-3">{s.desc}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">{s.benefit}</span>
                    <button className="text-xs font-semibold text-green-700 hover:text-green-900 flex items-center gap-1 transition-colors">
                      Apply <ExternalLink size={12} />
                    </button>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* ═══════════════════════════════════════════
            9. AI EXPERT FARMING ASSISTANT
        ═══════════════════════════════════════════ */}
        <Section id="ai-assistant" icon={MessageSquare} title="Ask AgroVision AI">
          <GlassCard className="p-5 space-y-4" hover={false}>
            {/* Chat area */}
            <div className="max-h-72 overflow-y-auto space-y-3 scrollbar-thin">
              {chatHistory.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">
                  <Bot size={32} className="mx-auto mb-2 opacity-40" />
                  Ask any farming question — crop care, pest management, soil health, market advice…
                </div>
              )}

              <AnimatePresence>
                {chatHistory.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "ai" && (
                      <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                        <Bot size={14} className="text-green-700" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-green-600 text-white rounded-br-md"
                          : "bg-slate-100 text-slate-800 rounded-bl-md"
                      }`}
                    >
                      {msg.text}
                    </div>
                    {msg.role === "user" && (
                      <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                        <User size={14} className="text-slate-600" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {isTyping && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Bot size={14} />
                  <span className="animate-pulse">AgroVision AI is thinking…</span>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAskAI()}
                placeholder="e.g. My cotton leaves are turning yellow. What should I do?"
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-green-400/40 text-sm"
              />
              <button
                onClick={handleAskAI}
                disabled={!chatInput.trim()}
                className="px-5 py-3 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm"
              >
                <Send size={16} /> Ask
              </button>
            </div>
          </GlassCard>
        </Section>

        {/* ═══════════════════════════════════════════
            10. REAL-TIME FARM ALERTS
        ═══════════════════════════════════════════ */}
        <Section icon={Bell} title="Critical Alerts">
          <div className="space-y-3">
            {criticalAlerts.map((alert, i) => {
              const rc = riskColor(alert.severity);
              const AlertIcon = alert.severity === "high" ? AlertTriangle : ShieldAlert;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * i }}
                >
                  <GlassCard className={`px-5 py-4 flex items-start gap-3 ${rc.bg} ${rc.border}`} hover={false}>
                    <AlertIcon size={20} className={`${rc.text} shrink-0 mt-0.5`} />
                    <div>
                      <p className={`font-semibold text-sm ${rc.text}`}>{alert.title}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{alert.desc}</p>
                    </div>
                    <span className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${rc.badge}`}>
                      {alert.severity === "high" ? "Urgent" : "Warning"}
                    </span>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </Section>

        {/* ═══════════════════════════════════════════
            11. QUICK FARMER ACTION PANEL
        ═══════════════════════════════════════════ */}
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <Zap size={22} className="text-green-700" />
            <h2 className="text-xl md:text-2xl font-bold text-slate-800">Quick Actions</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {quickActions.map((action, i) => (
              <motion.a
                key={action.label}
                href={action.path}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.08 * i }}
                whileHover={{ y: -4, scale: 1.03 }}
                className={`group relative overflow-hidden rounded-2xl bg-linear-to-br ${action.color} p-5 text-white shadow-lg cursor-pointer`}
              >
                <div className="absolute -right-3 -top-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <action.icon size={72} />
                </div>
                <action.icon size={26} className="mb-3 relative z-10" />
                <p className="text-sm font-semibold relative z-10 leading-tight">{action.label}</p>
                <ChevronRight size={16} className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.a>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
};

export default Advisory;