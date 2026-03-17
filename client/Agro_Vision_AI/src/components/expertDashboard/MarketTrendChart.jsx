import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Loader2 } from "lucide-react";
import { fetchExpertMarketTrends } from "../../api/expertDashboardApi";

const DAY_OPTIONS = [7, 14, 30, 60, 90];

export default function MarketTrendChart({ availableCrops = [] }) {
  const [crop, setCrop] = useState("Wheat");
  const [days, setDays] = useState(30);

  const { data, isLoading } = useQuery({
    queryKey: ["expert-market-trends", crop, days],
    queryFn: () => fetchExpertMarketTrends({ crop, days }),
    staleTime: 120_000
  });

  const points = data?.points || [];
  const summary = data?.summary || {};
  const crops = availableCrops.length ? availableCrops : ["Wheat", "Rice", "Maize", "Cotton", "Soybean"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-emerald-600" />
          <h2 className="text-slate-800 font-semibold text-base">Crop Market Intelligence</h2>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={crop}
            onChange={(e) => setCrop(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-1.5 outline-none"
          >
            {crops.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-1.5 outline-none"
          >
            {DAY_OPTIONS.map((d) => <option key={d} value={d}>{d}d</option>)}
          </select>
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex gap-3 mb-4 flex-wrap">
        {[
          { label: "Current", value: `₹${summary.currentPrice || 0}` },
          { label: "Average", value: `₹${summary.averagePrice || 0}` },
          { label: "Change", value: `${summary.changePercent >= 0 ? "+" : ""}${summary.changePercent || 0}%`, green: summary.changePercent >= 0 }
        ].map((s) => (
          <span key={s.label} className={`text-xs px-3 py-1 rounded-full border ${s.green === false ? "border-red-300 text-red-600 bg-red-50" : s.green ? "border-emerald-300 text-emerald-700 bg-emerald-50" : "border-slate-200 text-slate-600 bg-slate-50"}`}>
            {s.label}: {s.value}
          </span>
        ))}
      </div>

      {isLoading ? (
        <div className="h-52 flex items-center justify-center">
          <Loader2 className="animate-spin text-emerald-600" size={28} />
        </div>
      ) : points.length === 0 ? (
        <div className="h-52 flex items-center justify-center text-slate-400 text-sm">No data available</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={points} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
            <Tooltip
              contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, color: "#1e293b", fontSize: 12 }}
              formatter={(v) => [`₹${v}`, "Price"]}
            />
            <Line type="monotone" dataKey="price" stroke="#059669" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "#059669" }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  );
}
