import { motion } from "framer-motion";
import { Sparkles, TrendingUp } from "lucide-react";

const fmt = (v) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(v || 0));

const RISK_CONFIG = {
  "High Risk":   { bg: "bg-red-100",     text: "text-red-700",     bar: "bg-red-500" },
  "Medium Risk": { bg: "bg-amber-100",   text: "text-amber-700",   bar: "bg-amber-500" },
  "Low Risk":    { bg: "bg-emerald-100", text: "text-emerald-700", bar: "bg-emerald-500" }
};

const RecommendationCard = ({ item, index }) => {
  const risk = RISK_CONFIG[item.riskIndicator] || RISK_CONFIG["Medium Risk"];
  const demand = Math.max(5, Math.min(100, Number(item.demandScore || 0)));

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      whileHover={{ y: -5, boxShadow: "0 20px 40px -12px rgba(0,0,0,0.12)" }}
      className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
    >
      {/* Image */}
      <div className="relative h-36 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
        {item.cropImage ? (
          <img src={item.cropImage} alt={item.cropName} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-4xl">🌾</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <span className={`absolute top-3 right-3 rounded-full px-2.5 py-1 text-xs font-bold ${risk.bg} ${risk.text}`}>
          {item.riskIndicator}
        </span>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-bold text-slate-900">{item.cropName}</h3>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 rounded-full px-2 py-0.5">
            <TrendingUp size={10} />
            AI Pick
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-slate-50 p-2">
            <p className="text-slate-500 mb-0.5">Market Price</p>
            <p className="font-bold text-slate-900">{fmt(item.currentMarketPrice || item.predictedPrice)}</p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-2">
            <p className="text-emerald-600 mb-0.5">AI Predicted</p>
            <p className="font-bold text-emerald-700">{fmt(item.predictedPrice)}</p>
          </div>
        </div>

        {/* Demand bar */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span>Demand Score</span>
            <span className="font-semibold text-slate-700">{Math.round(demand)}/100</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${demand}%` }}
              transition={{ duration: 0.8, delay: index * 0.06 + 0.3 }}
              className={`h-full rounded-full ${risk.bar}`}
            />
          </div>
        </div>
      </div>
    </motion.article>
  );
};

const AIRecommendations = ({ recommendations, isLoading }) => {
  const rows = Array.isArray(recommendations) ? recommendations : [];

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-xl bg-green-50 p-2.5">
            <Sparkles size={18} className="text-green-700" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">AI Crop Recommendations</h2>
            <p className="text-sm text-slate-500">XGBoost-powered predictions ranked by demand & risk</p>
          </div>
        </div>
        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
          {rows.length} crops
        </span>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : rows.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((item, i) => (
            <RecommendationCard key={`${item.cropName}_${i}`} item={item} index={i} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
          No AI recommendations available at this time.
        </div>
      )}
    </section>
  );
};

export default AIRecommendations;
