import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Brain,
  DollarSign,
  Filter,
  Flame,
  Leaf,
  LineChart,
  Loader2,
  MapPin,
  Minus,
  RefreshCcw,
  Search,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wheat,
  Zap
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  getMarketIntelPrices,
  getMarketIntelTrends,
  getMarketIntelPredict,
  getMarketIntelInsights,
  getMarketIntelProfitability,
  getMarketIntelNearby,
  getMarketIntelHeatmap
} from "../../api/marketplaceApi";

/* ─── Presets ─────────────────────────────────────────────────────── */

const CROP_LIST = ["Wheat", "Rice", "Cotton", "Maize", "Tomato", "Potato", "Onion", "Soybean", "Groundnut", "Chilli"];
const CATEGORIES = ["All", "Grains", "Vegetables", "Cash Crops", "Oilseeds"];
const POPULAR_CROPS = ["Wheat", "Rice", "Cotton", "Maize", "Tomato", "Potato"];

const CATEGORY_MAP = {
  Grains: ["Wheat", "Rice", "Maize"],
  Vegetables: ["Tomato", "Potato", "Onion"],
  "Cash Crops": ["Cotton", "Sugarcane", "Chilli"],
  Oilseeds: ["Soybean", "Groundnut"]
};

/* ─── Animations ──────────────────────────────────────────────────── */

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } }
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }
};

const cardHover = { y: -4, transition: { duration: 0.2, ease: "easeOut" } };

/* ─── Helpers ─────────────────────────────────────────────────────── */

const formatINR = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "₹0";
  return `₹${new Intl.NumberFormat("en-IN").format(Math.round(num))}`;
};

const DemandBadge = ({ level }) => {
  const styles = {
    High: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Medium: "bg-amber-100 text-amber-700 border-amber-200",
    Low: "bg-rose-100 text-rose-700 border-rose-200"
  };
  const dots = { High: "🟢", Medium: "🟡", Low: "🔴" };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${styles[level] || styles.Medium}`}>
      {dots[level] || "🟡"} {level || "Medium"}
    </span>
  );
};

const PriceChange = ({ value }) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num === 0) return <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500"><Minus size={12} /> 0%</span>;
  const positive = num > 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold ${positive ? "text-emerald-600" : "text-rose-600"}`}>
      {positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
      {positive ? "+" : ""}{num.toFixed(1)}%
    </span>
  );
};

const GlassCard = ({ children, className = "", ...props }) => (
  <motion.div
    variants={fadeUp}
    whileHover={cardHover}
    className={`rounded-2xl border border-white/40 bg-white/70 p-5 shadow-lg shadow-black/4 backdrop-blur-md ${className}`}
    {...props}
  >
    {children}
  </motion.div>
);

const SectionTitle = ({ icon, title, subtitle }) => (
  <div className="mb-4">
    <h2 className="inline-flex items-center gap-2 text-lg font-extrabold text-slate-800">
      {React.createElement(icon, { size: 18, className: "text-emerald-600" })}
      {title}
    </h2>
    {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
  </div>
);

const SkeletonBlock = ({ className = "h-40" }) => (
  <div className={`animate-pulse rounded-2xl bg-slate-200/60 ${className}`} />
);

/* ─── Main Component ──────────────────────────────────────────────── */

const Marketplace = () => {
  const [selectedCrop, setSelectedCrop] = useState("Wheat");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [marketPrices, setMarketPrices] = useState([]);
  const [priceTrends, setPriceTrends] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [insights, setInsights] = useState(null);
  const [profitability, setProfitability] = useState(null);
  const [nearbyMarkets, setNearbyMarkets] = useState([]);
  const [demandHeatmap, setDemandHeatmap] = useState([]);
  const [error, setError] = useState("");

  const filteredCrops = useMemo(() => {
    let crops = CROP_LIST;
    if (activeCategory !== "All") {
      crops = CATEGORY_MAP[activeCategory] || CROP_LIST;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      crops = crops.filter((c) => c.toLowerCase().includes(q));
    }
    return crops;
  }, [activeCategory, searchQuery]);

  const fetchAllData = useCallback(async (crop, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const [pricesRes, trendsRes, predictRes, insightsRes, profitRes, nearbyRes, heatmapRes] = await Promise.allSettled([
        getMarketIntelPrices(crop),
        getMarketIntelTrends(crop, 30),
        getMarketIntelPredict(crop),
        getMarketIntelInsights(crop),
        getMarketIntelProfitability(crop),
        getMarketIntelNearby(crop, "Ahmedabad"),
        getMarketIntelHeatmap(crop)
      ]);

      if (pricesRes.status === "fulfilled") setMarketPrices(pricesRes.value?.prices || []);
      if (trendsRes.status === "fulfilled") setPriceTrends(trendsRes.value?.trends || []);
      if (predictRes.status === "fulfilled") setPrediction(predictRes.value || null);
      if (insightsRes.status === "fulfilled") setInsights(insightsRes.value || null);
      if (profitRes.status === "fulfilled") setProfitability(profitRes.value || null);
      if (nearbyRes.status === "fulfilled") setNearbyMarkets(nearbyRes.value?.markets || []);
      if (heatmapRes.status === "fulfilled") setDemandHeatmap(heatmapRes.value?.heatmap || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load market data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData(selectedCrop);
  }, [selectedCrop, fetchAllData]);

  const chartData = useMemo(() =>
    priceTrends.map((row) => ({
      date: new Date(row.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      price: row.price
    })),
    [priceTrends]
  );

  const nearbyChartData = useMemo(() =>
    nearbyMarkets.slice(0, 8).map((m) => ({
      market: m.market,
      price: m.price
    })),
    [nearbyMarkets]
  );

  const onCropSelect = (crop) => {
    setSelectedCrop(crop);
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-emerald-50/30 to-blue-50/20 px-4 py-6 sm:px-6 lg:px-8">
      <motion.div
        className="mx-auto max-w-7xl space-y-6"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {/* ── 1. Page Header ─────────────────────────────────────── */}
        <motion.section
          variants={fadeUp}
          className="overflow-hidden rounded-3xl border border-emerald-200/60 bg-linear-to-br from-emerald-700 via-emerald-800 to-teal-900 p-6 text-white shadow-2xl shadow-emerald-900/25 sm:p-8"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest backdrop-blur-sm">
                <Sparkles size={13} />
                Smart Market Intelligence
              </div>
              <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl lg:text-[2.6rem]">
                Crop Marketplace Intelligence
              </h1>
              <p className="mt-3 text-base text-emerald-100/90 sm:text-lg">
                Track real-time crop market prices and AI-powered demand insights.
              </p>
              <p className="mt-2 max-w-xl text-sm text-emerald-200/70">
                Analyze crop prices, demand trends, and predicted market values before selling your harvest.
              </p>
            </div>

            <motion.button
              type="button"
              onClick={() => fetchAllData(selectedCrop, true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-50"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              {refreshing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCcw size={15} />}
              Refresh Data
            </motion.button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full border border-white/30 bg-white/15 px-3 py-1 font-bold">
              <Wheat size={13} className="mr-1.5 inline" />
              Analyzing: {selectedCrop}
            </span>
            {prediction?.trend && (
              <span className="rounded-full border border-white/30 bg-white/15 px-3 py-1 font-semibold">
                Trend: {prediction.trend}
              </span>
            )}
            {prediction?.demandLevel && (
              <span className="rounded-full border border-white/30 bg-white/15 px-3 py-1 font-semibold">
                Demand: {prediction.demandLevel}
              </span>
            )}
          </div>
        </motion.section>

        {/* ── 2. Smart Crop Search ───────────────────────────────── */}
        <motion.section variants={fadeUp}>
          <GlassCard className="space-y-4">
            <SectionTitle icon={Search} title="Smart Crop Search" subtitle="Search, filter, or pick a popular crop to analyze" />

            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search crops... (e.g. Wheat, Rice, Cotton)"
                className="w-full rounded-xl border border-slate-200 bg-white/80 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Filter size={14} className="mt-1 text-slate-400" />
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${activeCategory === cat
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Popular Crops</p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_CROPS.map((crop) => (
                  <motion.button
                    key={crop}
                    type="button"
                    onClick={() => onCropSelect(crop)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${selectedCrop === crop
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                      : "border border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
                    }`}
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Leaf size={13} className="mr-1.5 inline" />
                    {crop}
                  </motion.button>
                ))}
              </div>
            </div>

            {searchQuery.trim() && filteredCrops.length > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                {filteredCrops.map((crop) => (
                  <button
                    key={crop}
                    type="button"
                    onClick={() => onCropSelect(crop)}
                    className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                  >
                    {crop}
                  </button>
                ))}
              </div>
            )}
            {searchQuery.trim() && filteredCrops.length === 0 && (
              <p className="text-sm text-slate-400">No matching crops found.</p>
            )}
          </GlassCard>
        </motion.section>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading */}
        {loading ? (
          <motion.div variants={fadeUp} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonBlock key={`sk-${i}`} className="h-48" />
            ))}
          </motion.div>
        ) : (
          <>
            {/* ── 3. Real-Time Market Price Table ─────────────────── */}
            <motion.section variants={fadeUp}>
              <GlassCard>
                <SectionTitle icon={Activity} title="Real-Time Mandi Prices" subtitle={`Live market prices for ${selectedCrop} across major mandis`} />
                <div className="overflow-x-auto">
                  <table className="w-full min-w-160 text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                        <th className="px-3 py-3">Crop Name</th>
                        <th className="px-3 py-3">Market Location</th>
                        <th className="px-3 py-3">Current Price</th>
                        <th className="px-3 py-3">Price Change</th>
                        <th className="px-3 py-3">Demand Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marketPrices.length ? marketPrices.map((row, idx) => (
                        <motion.tr
                          key={`${row.market}-${idx}`}
                          className="border-b border-slate-100 text-slate-700 transition hover:bg-emerald-50/40"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                        >
                          <td className="px-3 py-3 font-semibold">{row.cropName}</td>
                          <td className="px-3 py-3">
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin size={12} className="text-slate-400" />
                              {row.market}
                            </span>
                          </td>
                          <td className="px-3 py-3 font-bold text-slate-800">{formatINR(row.price)}/{row.unit}</td>
                          <td className="px-3 py-3"><PriceChange value={row.priceChange} /></td>
                          <td className="px-3 py-3"><DemandBadge level={row.demandLevel} /></td>
                        </motion.tr>
                      )) : (
                        <tr>
                          <td colSpan={5} className="px-3 py-8 text-center text-slate-400">No market data available.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </motion.section>

            {/* ── 4. Demand Indicators + 5. AI Price Prediction ───── */}
            <motion.div variants={fadeUp} className="grid gap-6 lg:grid-cols-2">
              <GlassCard>
                <SectionTitle icon={Flame} title="Market Demand Indicators" subtitle="Current demand levels across markets" />
                <div className="grid gap-3 sm:grid-cols-2">
                  {(() => {
                    const demandCounts = { High: 0, Medium: 0, Low: 0 };
                    marketPrices.forEach((p) => { demandCounts[p.demandLevel] = (demandCounts[p.demandLevel] || 0) + 1; });
                    return Object.entries(demandCounts).map(([level, count]) => {
                      const colors = { High: "border-emerald-200 bg-emerald-50", Medium: "border-amber-200 bg-amber-50", Low: "border-rose-200 bg-rose-50" };
                      const textColors = { High: "text-emerald-700", Medium: "text-amber-700", Low: "text-rose-700" };
                      return (
                        <motion.div key={level} whileHover={cardHover} className={`rounded-xl border p-4 ${colors[level]}`}>
                          <DemandBadge level={level} />
                          <p className={`mt-2 text-2xl font-black ${textColors[level]}`}>{count}</p>
                          <p className="text-xs text-slate-500">{count === 1 ? "market" : "markets"}</p>
                        </motion.div>
                      );
                    });
                  })()}
                </div>
              </GlassCard>

              <GlassCard>
                <SectionTitle icon={Brain} title="AI Price Prediction" subtitle="AI-powered future price forecast" />
                {prediction ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Current Price</p>
                      <p className="mt-1 text-2xl font-black text-emerald-800">{formatINR(prediction.currentPrice)}/qtl</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4">
                        <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Next Week</p>
                        <p className="mt-1 text-xl font-black text-blue-800">{formatINR(prediction.predictedPriceWeek)}</p>
                        <p className="mt-1 text-xs text-blue-500">
                          {prediction.predictedPriceWeek > prediction.currentPrice ? (
                            <span className="inline-flex items-center gap-1"><TrendingUp size={12} /> Rising</span>
                          ) : prediction.predictedPriceWeek < prediction.currentPrice ? (
                            <span className="inline-flex items-center gap-1"><TrendingDown size={12} /> Falling</span>
                          ) : "Stable"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4">
                        <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Next Month</p>
                        <p className="mt-1 text-xl font-black text-indigo-800">{formatINR(prediction.predictedPriceMonth)}</p>
                        <p className="mt-1 text-xs text-indigo-500">
                          {prediction.predictedPriceMonth > prediction.currentPrice ? (
                            <span className="inline-flex items-center gap-1"><TrendingUp size={12} /> Rising</span>
                          ) : prediction.predictedPriceMonth < prediction.currentPrice ? (
                            <span className="inline-flex items-center gap-1"><TrendingDown size={12} /> Falling</span>
                          ) : "Stable"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        Confidence: {prediction.confidence}%
                      </span>
                      <DemandBadge level={prediction.demandLevel} />
                      {prediction.engine && (
                        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-600">
                          Engine: {prediction.engine}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Prediction data unavailable.</p>
                )}
              </GlassCard>
            </motion.div>

            {/* ── 6. Price Trend Chart ────────────────────────────── */}
            <motion.section variants={fadeUp}>
              <GlassCard>
                <SectionTitle icon={LineChart} title="Price Trend Analysis" subtitle={`Last 30 days price trend for ${selectedCrop}`} />
                {chartData.length > 1 ? (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 12, right: 12, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} />
                        <YAxis tick={{ fill: "#64748b", fontSize: 11 }} width={60} tickFormatter={(v) => `₹${v}`} />
                        <Tooltip
                          contentStyle={{ borderRadius: 12, borderColor: "#d1d5db", fontSize: 12, backgroundColor: "rgba(255,255,255,0.95)" }}
                          formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}/qtl`, "Price"]}
                        />
                        <Area type="monotone" dataKey="price" stroke="#059669" strokeWidth={2.5} fill="url(#trendGradient)" dot={false} activeDot={{ r: 5, fill: "#059669" }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-slate-400">Not enough data to render trend chart.</p>
                )}

                {chartData.length > 1 && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {(() => {
                      const prices = chartData.map((d) => d.price);
                      const max = Math.max(...prices);
                      const min = Math.min(...prices);
                      const avg = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
                      return (
                        <>
                          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-center">
                            <p className="text-xs font-bold uppercase text-emerald-600">Highest</p>
                            <p className="mt-1 text-lg font-black text-emerald-800">{formatINR(max)}</p>
                          </div>
                          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-center">
                            <p className="text-xs font-bold uppercase text-blue-600">Average</p>
                            <p className="mt-1 text-lg font-black text-blue-800">{formatINR(avg)}</p>
                          </div>
                          <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3 text-center">
                            <p className="text-xs font-bold uppercase text-rose-600">Lowest</p>
                            <p className="mt-1 text-lg font-black text-rose-800">{formatINR(min)}</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </GlassCard>
            </motion.section>

            {/* ── 7. Nearby Market Comparison ─────────────────────── */}
            <motion.section variants={fadeUp}>
              <GlassCard>
                <SectionTitle icon={MapPin} title="Nearby Market Comparison" subtitle={`Compare ${selectedCrop} prices across nearby markets`} />
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                          <th className="px-3 py-2">Market</th>
                          <th className="px-3 py-2">Price</th>
                          <th className="px-3 py-2">Demand</th>
                        </tr>
                      </thead>
                      <tbody>
                        {nearbyMarkets.map((m, idx) => (
                          <tr key={m.market} className={`border-b border-slate-100 text-slate-700 ${idx === 0 ? "bg-emerald-50/50 font-semibold" : ""}`}>
                            <td className="px-3 py-2.5">
                              <MapPin size={12} className="mr-1 inline text-slate-400" />
                              {m.market}
                              {idx === 0 && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Best Price</span>}
                            </td>
                            <td className="px-3 py-2.5 font-bold">{formatINR(m.price)}/{m.unit}</td>
                            <td className="px-3 py-2.5"><DemandBadge level={m.demandLevel} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {nearbyChartData.length > 0 && (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={nearbyChartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="market" tick={{ fill: "#64748b", fontSize: 10 }} />
                          <YAxis tick={{ fill: "#64748b", fontSize: 11 }} width={60} tickFormatter={(v) => `₹${v}`} />
                          <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, "Price"]} />
                          <Bar dataKey="price" radius={[8, 8, 0, 0]}>
                            {nearbyChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? "#059669" : "#94a3b8"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </GlassCard>
            </motion.section>

            {/* ── 8. AI Market Insights + 9. Demand Heatmap ───────── */}
            <motion.div variants={fadeUp} className="grid gap-6 lg:grid-cols-2">
              <GlassCard>
                <SectionTitle icon={Zap} title="AI Market Insights" subtitle="AI-generated analysis and recommendations" />
                {insights ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-amber-600">AI Insight</p>
                      <p className="mt-2 text-sm font-medium text-amber-800">{insights.insight}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Recommendation</p>
                      <p className="mt-2 text-sm font-medium text-emerald-800">{insights.recommendation}</p>
                    </div>
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      Confidence: {insights.confidence}%
                    </span>
                  </div>
                ) : (
                  <p className="py-4 text-sm text-slate-400">Market insights unavailable.</p>
                )}
              </GlassCard>

              <GlassCard>
                <SectionTitle icon={Target} title="Market Demand Heatmap" subtitle="Demand distribution across major markets" />
                <div className="space-y-3">
                  {demandHeatmap.length > 0 ? demandHeatmap.map((row) => {
                    const barColor = row.demandScore >= 70 ? "from-emerald-400 to-emerald-600" : row.demandScore >= 45 ? "from-amber-400 to-amber-500" : "from-rose-400 to-rose-500";
                    return (
                      <motion.div
                        key={row.market}
                        className="rounded-xl border border-slate-100 bg-white/60 p-3"
                        whileHover={{ y: -2 }}
                        transition={{ duration: 0.15 }}
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold text-slate-700">{row.market}</span>
                          <DemandBadge level={row.demandLevel} />
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-slate-100">
                          <motion.div
                            className={`h-2 rounded-full bg-linear-to-r ${barColor}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, Math.max(8, row.demandScore))}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                          />
                        </div>
                        <p className="mt-1 text-right text-xs text-slate-500">{row.demandScore}/100</p>
                      </motion.div>
                    );
                  }) : (
                    <p className="py-4 text-sm text-slate-400">No heatmap data available.</p>
                  )}
                </div>
              </GlassCard>
            </motion.div>

            {/* ── 10. Crop Profitability Indicator ────────────────── */}
            <motion.section variants={fadeUp}>
              <GlassCard>
                <SectionTitle icon={DollarSign} title="Crop Profitability Analysis" subtitle={`Estimated profit breakdown for ${selectedCrop}`} />
                {profitability ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <motion.div whileHover={cardHover} className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Production Cost</p>
                      <p className="mt-2 text-xl font-black text-slate-700">{formatINR(profitability.productionCost)}<span className="text-sm font-medium text-slate-400">/{profitability.unit}</span></p>
                    </motion.div>
                    <motion.div whileHover={cardHover} className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-center">
                      <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Market Price</p>
                      <p className="mt-2 text-xl font-black text-blue-800">{formatINR(profitability.marketPrice)}<span className="text-sm font-medium text-blue-400">/{profitability.unit}</span></p>
                    </motion.div>
                    <motion.div
                      whileHover={cardHover}
                      className={`rounded-xl border p-4 text-center ${profitability.estimatedProfit >= 0 ? "border-emerald-200 bg-emerald-50/60" : "border-rose-200 bg-rose-50/60"}`}
                    >
                      <p className={`text-xs font-bold uppercase tracking-widest ${profitability.estimatedProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>Estimated Profit</p>
                      <p className={`mt-2 text-xl font-black ${profitability.estimatedProfit >= 0 ? "text-emerald-800" : "text-rose-800"}`}>{formatINR(profitability.estimatedProfit)}<span className="text-sm font-medium opacity-60">/{profitability.unit}</span></p>
                    </motion.div>
                    <motion.div
                      whileHover={cardHover}
                      className={`rounded-xl border p-4 text-center ${profitability.estimatedProfit >= 0 ? "border-emerald-200 bg-emerald-50/60" : "border-rose-200 bg-rose-50/60"}`}
                    >
                      <p className={`text-xs font-bold uppercase tracking-widest ${profitability.estimatedProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>Profit Margin</p>
                      <p className={`mt-2 text-xl font-black ${profitability.estimatedProfit >= 0 ? "text-emerald-800" : "text-rose-800"}`}>{profitability.profitMargin}%</p>
                      <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${profitability.status === "Profitable" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                        {profitability.status}
                      </span>
                    </motion.div>
                  </div>
                ) : (
                  <p className="py-4 text-sm text-slate-400">Profitability data unavailable.</p>
                )}
              </GlassCard>
            </motion.section>

            {/* ── Best Crops to Sell ──────────────────────────────── */}
            <motion.section variants={fadeUp}>
              <GlassCard className="border-emerald-200/60 bg-linear-to-br from-emerald-50/80 via-white/80 to-blue-50/60">
                <SectionTitle icon={BarChart3} title="Best Crops to Sell Now" subtitle="Top-performing crops by market conditions" />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {marketPrices
                    .filter((p) => p.demandLevel === "High")
                    .slice(0, 6)
                    .map((crop, idx) => (
                      <motion.div
                        key={`best-${crop.market}-${idx}`}
                        className="rounded-xl border border-emerald-200 bg-white/80 p-4 backdrop-blur-sm"
                        whileHover={cardHover}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-slate-800">{crop.cropName}</h3>
                          <DemandBadge level="High" />
                        </div>
                        <p className="mt-2 text-lg font-black text-emerald-700">{formatINR(crop.price)}/{crop.unit}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          <MapPin size={11} className="mr-1 inline" />
                          {crop.market}
                        </p>
                        <PriceChange value={crop.priceChange} />
                      </motion.div>
                    ))}
                  {marketPrices.filter((p) => p.demandLevel === "High").length === 0 && (
                    <p className="col-span-full py-4 text-center text-sm text-slate-400">No high-demand crops at the moment.</p>
                  )}
                </div>
              </GlassCard>
            </motion.section>

            {/* ── Footer Summary ──────────────────────────────────── */}
            <motion.section
              variants={fadeUp}
              className="grid gap-3 rounded-2xl border border-slate-200/60 bg-white/50 p-4 backdrop-blur-sm sm:grid-cols-2 lg:grid-cols-4"
            >
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Markets Tracked</p>
                <p className="mt-1 text-2xl font-black text-emerald-800">{marketPrices.length}</p>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Data Points</p>
                <p className="mt-1 text-2xl font-black text-blue-800">{priceTrends.length}</p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3 text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-600">AI Confidence</p>
                <p className="mt-1 text-2xl font-black text-amber-800">{prediction?.confidence || "—"}%</p>
              </div>
              <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3 text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-violet-600">Prediction Engine</p>
                <p className="mt-1 text-lg font-black text-violet-800">{prediction?.engine || "—"}</p>
              </div>
            </motion.section>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default Marketplace;
