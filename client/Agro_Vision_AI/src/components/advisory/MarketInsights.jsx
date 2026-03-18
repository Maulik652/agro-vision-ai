import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Minus, BarChart2, Loader2, RefreshCw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { fetchMarketInsights } from "../../api/advisoryApi";

const TREND = {
  rising:  { icon: TrendingUp,   color: "text-emerald-600", bar: "bg-emerald-500", border: "border-emerald-100" },
  falling: { icon: TrendingDown, color: "text-red-600",     bar: "bg-red-500",     border: "border-red-100" },
  stable:  { icon: Minus,        color: "text-amber-600",   bar: "bg-amber-400",   border: "border-amber-100" },
};
const DEMAND_BADGE = {
  very_high: "bg-red-100 text-red-700",
  high:      "bg-orange-100 text-orange-700",
  medium:    "bg-amber-100 text-amber-700",
  low:       "bg-slate-100 text-slate-600",
};

const Tip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-lg text-xs">
      <p className="font-semibold text-slate-800">₹{payload[0]?.value?.toLocaleString()}</p>
    </div>
  );
};

export default function MarketInsights() {
  const { data: insights = [], isLoading, refetch } = useQuery({
    queryKey: ["market-insights"],
    queryFn: fetchMarketInsights,
    staleTime: 300_000,
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <BarChart2 size={14} className="text-blue-600" />
          <h2 className="text-sm font-semibold text-slate-900">Market Insights</h2>
        </div>
        <button onClick={() => refetch()} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
          <RefreshCw size={12} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-14">
          <Loader2 size={22} className="animate-spin text-blue-500" />
        </div>
      ) : insights.length === 0 ? (
        <div className="py-14 text-center text-slate-400 text-xs">No market data available</div>
      ) : (
        <div className="p-3 space-y-2.5">
          {insights.map((item, i) => {
            const meta = TREND[item.priceTrend] || TREND.stable;
            const Icon = meta.icon;
            const hasHistory = item.priceHistory?.length > 1;

            return (
              <motion.div
                key={item._id || i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`p-3.5 rounded-xl border bg-slate-50 ${meta.border}`}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-900">{item.crop}</span>
                      {item.region && <span className="text-[10px] text-slate-400">{item.region}</span>}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-base font-bold text-slate-900">₹{item.currentPrice?.toLocaleString()}</span>
                      <span className={`flex items-center gap-0.5 text-xs font-semibold ${meta.color}`}>
                        <Icon size={11} />
                        {item.priceChange > 0 ? "+" : ""}{item.priceChange}%
                      </span>
                    </div>
                  </div>
                  {item.demandLevel && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize shrink-0 ${DEMAND_BADGE[item.demandLevel] || DEMAND_BADGE.medium}`}>
                      {item.demandLevel.replace("_", " ")}
                    </span>
                  )}
                </div>

                {/* Sparkline */}
                {hasHistory && (
                  <div className="h-12">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={item.priceHistory}>
                        <XAxis dataKey="date" hide />
                        <YAxis hide domain={["auto", "auto"]} />
                        <Tooltip content={<Tip />} />
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke={item.priceTrend === "rising" ? "#16a34a" : item.priceTrend === "falling" ? "#dc2626" : "#d97706"}
                          strokeWidth={1.5}
                          dot={false}
                        />
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
