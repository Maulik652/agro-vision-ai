import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Zap, MapPin, BarChart3, Sparkles, Loader2, RefreshCcw, ArrowUpRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getMarketInsights } from "../../../api/farmerMarketplaceApi";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const CROPS = ["Wheat","Rice","Maize","Cotton","Soybean","Groundnut","Potato","Tomato","Onion","Sugarcane","Mango","Banana","Grapes","Sunflower","Mustard"];

const DEMAND_STYLES = {
  High: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Medium: "bg-amber-100 text-amber-700 border-amber-200",
  Low: "bg-rose-100 text-rose-700 border-rose-200",
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="text-sm font-black text-emerald-700">₹{payload[0]?.value?.toLocaleString("en-IN")}</p>
    </div>
  );
};

export default function MarketInsightsPanel({ selectedCrop = "Wheat", onCropChange, compact = false }) {
  const [crop, setCrop] = useState(selectedCrop);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["farmerInsights", crop],
    queryFn: () => getMarketInsights(crop),
    staleTime: 120000,
    retry: 1,
  });

  const ins = data?.insights || data || {};
  const trends = ins.trends || [];
  const markets = ins.markets || [];

  const handleCropChange = (c) => { setCrop(c); onCropChange?.(c); };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-16">
        <Loader2 size={18} className="animate-spin text-emerald-600" />
        <span className="text-sm text-slate-500">Loading market data...</span>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${compact ? "p-4" : "p-6"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100"><TrendingUp size={15} className="text-violet-600" /></div>
          <div>
            <h3 className="text-sm font-black text-slate-800">Market Intelligence</h3>
            <p className="text-[10px] text-slate-500">AI-powered price & demand analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={crop} onChange={(e) => handleCropChange(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-violet-400 focus:outline-none">
            {CROPS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => refetch()} className="flex h-7 w-7 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 transition"><RefreshCcw size={12} /></button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-4">
        {[
          { label: "Current Price", value: `₹${ins.currentPrice?.toLocaleString("en-IN") || 0}`, sub: "per quintal", color: "text-emerald-700", bg: "bg-emerald-50" },
          { label: "7-Day Forecast", value: `₹${ins.weekPrice?.toLocaleString("en-IN") || 0}`, sub: "projected", color: "text-blue-700", bg: "bg-blue-50" },
          { label: "Demand Score", value: `${ins.demandScore || 0}/100`, sub: ins.demandLevel || "—", color: "text-violet-700", bg: "bg-violet-50" },
          { label: "AI Confidence", value: `${ins.confidence || 0}%`, sub: "accuracy", color: "text-amber-700", bg: "bg-amber-50" },
        ].map((m) => (
          <div key={m.label} className={`rounded-xl ${m.bg} p-3`}>
            <p className={`text-lg font-black ${m.color}`}>{m.value}</p>
            <p className="text-[10px] font-semibold text-slate-500">{m.label}</p>
            <p className="text-[9px] text-slate-400">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* AI Recommendation */}
      {ins.recommendation && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 p-3">
          <Sparkles size={14} className="mt-0.5 shrink-0 text-violet-600" />
          <div>
            <p className="text-xs font-bold text-violet-800">AI Recommendation</p>
            <p className="mt-0.5 text-xs text-violet-700">{ins.recommendation}</p>
            {ins.bestWindow && <p className="mt-1 text-[10px] font-semibold text-violet-600">⏰ {ins.bestWindow}</p>}
          </div>
          {ins.demandLevel && (
            <span className={`ml-auto shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${DEMAND_STYLES[ins.demandLevel]}`}>{ins.demandLevel}</span>
          )}
        </div>
      )}

      {/* Price Trend Chart */}
      {!compact && trends.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-bold text-slate-700">30-Day Price Trend</p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} tickFormatter={(v) => v.slice(5)} interval={6} />
                <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="price" stroke="#7c3aed" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#7c3aed" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top Markets */}
      {!compact && markets.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold text-slate-700">Best Markets to Sell</p>
          <div className="space-y-1.5">
            {markets.slice(0, 5).map((m, i) => (
              <div key={m.market} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[9px] font-black text-slate-600">{i + 1}</span>
                <MapPin size={11} className="text-slate-400" />
                <span className="flex-1 text-xs font-semibold text-slate-700">{m.market}</span>
                <span className="text-xs font-black text-emerald-700">₹{m.price?.toLocaleString("en-IN")}</span>
                <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${DEMAND_STYLES[m.demandLevel] || DEMAND_STYLES.Medium}`}>{m.demandLevel}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Insights */}
      {ins.aiInsights?.length > 0 && (
        <div className={`${compact ? "mt-3" : "mt-4"} space-y-1.5`}>
          {ins.aiInsights.map((tip, i) => (
            <div key={i} className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2">
              <Zap size={11} className="mt-0.5 shrink-0 text-emerald-600" />
              <p className="text-[11px] text-emerald-800">{tip}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
