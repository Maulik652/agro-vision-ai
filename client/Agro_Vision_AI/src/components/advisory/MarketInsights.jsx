import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Minus, BarChart2, Loader2, RefreshCw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { fetchMarketInsights } from "../../api/advisoryApi";

const TREND_META = {
  rising:  { icon: TrendingUp,   color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
  falling: { icon: TrendingDown, color: "text-red-600",     bg: "bg-red-50 border-red-200" },
  stable:  { icon: Minus,        color: "text-amber-600",   bg: "bg-amber-50 border-amber-200" }
};
const DEMAND_COLOR = {
  very_high: "bg-red-100 text-red-700",
  high:      "bg-orange-100 text-orange-700",
  medium:    "bg-amber-100 text-amber-700",
  low:       "bg-slate-100 text-slate-600"
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="text-slate-500 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-medium">₹{p.value?.toLocaleString()}</p>
      ))}
    </div>
  );
};

export default function MarketInsights() {
  const { data: insights = [], isLoading, refetch } = useQuery({
    queryKey: ["market-insights"],
    queryFn: fetchMarketInsights,
    staleTime: 300_000
  });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <BarChart2 size={15} className="text-blue-600" />
          <h2 className="text-sm font-semibold text-slate-900">Market Insights</h2>
        </div>
        <button onClick={() => refetch()} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
          <RefreshCw size={13} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={22} className="animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {insights.map((item, i) => {
            const meta = TREND_META[item.priceTrend] || TREND_META.stable;
            const Icon = meta.icon;
            const hasHistory = item.priceHistory?.length > 1;

            return (
              <motion.div key={item._id || i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`p-4 rounded-xl border ${meta.bg}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{item.crop}</span>
                      <span className="text-[10px] text-slate-400">{item.region}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-lg font-bold text-slate-900">₹{item.currentPrice?.toLocaleString()}</span>
                      <span className={`flex items-center gap-0.5 text-xs font-medium ${meta.color}`}>
                        <Icon size={12} />
                        {item.priceChange > 0 ? "+" : ""}{item.priceChange}%
                      </span>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${DEMAND_COLOR[item.demandLevel] || DEMAND_COLOR.medium}`}>
                      {item.demandLevel?.replace("_", " ")} demand
                    </span>
                  </div>
                </div>

                {hasHistory && (
                  <div className="h-16 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={item.priceHistory}>
                        <XAxis dataKey="date" hide />
                        <YAxis hide domain={["auto", "auto"]} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="price" stroke={item.priceTrend === "rising" ? "#16a34a" : item.priceTrend === "falling" ? "#dc2626" : "#d97706"}
                          strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {item.forecast && (
                  <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">{item.forecast}</p>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
