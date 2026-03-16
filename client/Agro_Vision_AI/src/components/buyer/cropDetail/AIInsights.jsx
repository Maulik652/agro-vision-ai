import { motion } from "framer-motion";
import { Brain, Sparkles, TrendingUp, TrendingDown, Minus, BarChart2, Activity, Zap } from "lucide-react";

const fmt = (v) => `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Number(v || 0))}`;
const pct = (v) => `${Math.round(Number(v || 0) * 100)}%`;

const trendLabel = (current, predicted) => {
  if (!current || !predicted) return { label: "Stable", color: "text-slate-500", icon: Minus };
  const diff = ((predicted - current) / current) * 100;
  if (diff > 1) return { label: `+${diff.toFixed(1)}% Rising`, color: "text-emerald-700", icon: TrendingUp };
  if (diff < -1) return { label: `${diff.toFixed(1)}% Falling`, color: "text-red-600", icon: TrendingDown };
  return { label: "Stable", color: "text-amber-600", icon: Minus };
};

export default function AIInsights({ insights, source, cropName }) {
  if (!insights) return null;

  const { current_price, predicted_price, demand_score, volatility_index, confidence_score } = insights;
  const trend = trendLabel(current_price, predicted_price);
  const TrendIcon = trend.icon;

  const cards = [
    { icon: <BarChart2 size={15} className="text-blue-600" />, label: "Current Market Price", value: fmt(current_price), bg: "bg-blue-50 border-blue-100" },
    { icon: <Zap size={15} className="text-green-700" />, label: "AI Predicted Price", value: fmt(predicted_price), sub: <span className={trend.color}><TrendIcon size={10} className="inline mr-0.5" />{trend.label}</span>, bg: "bg-green-50 border-green-100" },
    { icon: <Activity size={15} className="text-violet-600" />, label: "Demand Score", value: pct(demand_score), sub: demand_score >= 0.7 ? "High demand" : demand_score >= 0.45 ? "Moderate" : "Low demand", bg: "bg-violet-50 border-violet-100" },
    { icon: <TrendingUp size={15} className="text-amber-600" />, label: "Market Volatility", value: pct(volatility_index), sub: volatility_index < 0.2 ? "Low risk" : volatility_index < 0.4 ? "Moderate risk" : "High risk", bg: "bg-amber-50 border-amber-100" },
    { icon: <Sparkles size={15} className="text-pink-600" />, label: "AI Confidence", value: pct(confidence_score), sub: "Model accuracy", bg: "bg-pink-50 border-pink-100" },
  ];

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-slate-800 font-semibold text-sm flex items-center gap-2">
          <Brain size={16} className="text-violet-600" /> AI Market Intelligence
          {cropName && <span className="text-slate-400 font-normal">· {cropName}</span>}
        </h3>
        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
          source === "ai-service"
            ? "bg-green-50 border-green-200 text-green-700"
            : "bg-slate-50 border-slate-200 text-slate-500"
        }`}>
          <Sparkles size={9} />
          {source === "ai-service" ? "Live AI · XGBoost" : "Estimated"}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((card, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`border rounded-xl p-3 ${card.bg}`}>
            <div className="mb-2">{card.icon}</div>
            <p className="text-slate-500 text-[10px] mb-1 leading-tight">{card.label}</p>
            <p className="text-slate-900 font-bold text-base">{card.value}</p>
            {card.sub && <p className="text-slate-500 text-[10px] mt-0.5">{card.sub}</p>}
          </motion.div>
        ))}
      </div>

      {demand_score != null && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-500">Demand Indicator</span>
            <span className={demand_score >= 0.7 ? "text-emerald-700 font-semibold" : demand_score >= 0.45 ? "text-amber-600 font-semibold" : "text-red-600 font-semibold"}>
              {pct(demand_score)}
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(demand_score * 100)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full ${demand_score >= 0.7 ? "bg-emerald-500" : demand_score >= 0.45 ? "bg-amber-500" : "bg-red-400"}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
