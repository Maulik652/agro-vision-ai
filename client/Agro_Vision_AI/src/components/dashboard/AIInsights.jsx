import { motion } from "framer-motion";
import { Activity, BrainCircuit, RefreshCcw, TrendingUp, Zap } from "lucide-react";

const fmt = (v) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(v || 0));

const LEVEL_CONFIG = {
  high:   { bg: "bg-red-100",     text: "text-red-700",     bar: "bg-red-500",     width: "85%" },
  medium: { bg: "bg-amber-100",   text: "text-amber-700",   bar: "bg-amber-500",   width: "55%" },
  low:    { bg: "bg-emerald-100", text: "text-emerald-700", bar: "bg-emerald-500", width: "25%" }
};

const InsightRow = ({ icon: Icon, label, value, badge, level, delay }) => {
  const cfg = LEVEL_CONFIG[level] || LEVEL_CONFIG.medium;
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay }}
      className="rounded-xl bg-slate-50 border border-slate-100 p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon size={15} className="text-slate-500" />
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        </div>
        {badge && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${cfg.bg} ${cfg.text}`}>
            {badge}
          </span>
        )}
      </div>
      <p className="text-xl font-bold text-slate-900">{value}</p>
      {level && (
        <div className="mt-2 h-1.5 rounded-full bg-slate-200 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: cfg.width }}
            transition={{ duration: 0.8, delay: delay + 0.2 }}
            className={`h-full rounded-full ${cfg.bar}`}
          />
        </div>
      )}
    </motion.div>
  );
};

const AIInsights = ({ insights, isLoading, onRefresh, isRefreshing }) => (
  <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
    <div className="mb-5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="inline-flex rounded-xl bg-green-50 p-2.5">
          <BrainCircuit size={18} className="text-green-700" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">AI Market Intelligence</h2>
          <p className="text-sm text-slate-500">
            {insights?.crop ? `Analysis for ${insights.crop}` : "Predictive analytics powered by AI"}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={isLoading || isRefreshing}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
      >
        <RefreshCcw size={13} className={isRefreshing ? "animate-spin" : ""} />
        Refresh
      </button>
    </div>

    {isLoading ? (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    ) : insights ? (
      <div className="space-y-3">
        <InsightRow
          icon={TrendingUp}
          label="Predicted Crop Price"
          value={fmt(insights.predictedCropPrice)}
          delay={0}
        />
        <InsightRow
          icon={Activity}
          label="Demand Forecast"
          value={`${insights.demandForecast?.score ?? "—"} / 100`}
          badge={insights.demandForecast?.level}
          level={insights.demandForecast?.level}
          delay={0.08}
        />
        <InsightRow
          icon={Zap}
          label="Market Volatility Index"
          value={`${insights.marketVolatility?.score ?? "—"} / 100`}
          badge={insights.marketVolatility?.level}
          level={insights.marketVolatility?.level}
          delay={0.16}
        />
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="rounded-full bg-green-50 border border-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
            Price: {insights.modelsUsed?.priceModel || "xgboost"}
          </span>
          <span className="rounded-full bg-green-50 border border-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
            Demand: {insights.modelsUsed?.demandModel || "random_forest"}
          </span>
        </div>
      </div>
    ) : (
      <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
        Unable to load AI insights. Please try refreshing.
      </div>
    )}
  </section>
);

export default AIInsights;
