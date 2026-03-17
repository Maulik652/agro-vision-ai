import React from "react";
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { Brain, TrendingUp, TrendingDown, Minus } from "lucide-react";

const TREND_CONFIG = {
  growing:           { icon: TrendingUp,   color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", label: "Growing" },
  declining:         { icon: TrendingDown, color: "text-red-600",     bg: "bg-red-50",     border: "border-red-200",     label: "Declining" },
  stable:            { icon: Minus,        color: "text-amber-600",   bg: "bg-amber-50",   border: "border-amber-200",   label: "Stable" },
  insufficient_data: { icon: Minus,        color: "text-slate-500",   bg: "bg-slate-50",   border: "border-slate-200",   label: "Insufficient Data" },
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: ₹{Number(p.value || 0).toLocaleString()}
        </p>
      ))}
    </div>
  );
};

const RevenueForecast = ({ data, loading }) => {
  const history  = data?.history  || [];
  const forecast = data?.forecast || [];
  const trend    = data?.trend    || "insufficient_data";
  const growthRate = data?.growthRate || 0;

  const cfg = TREND_CONFIG[trend] || TREND_CONFIG.stable;
  const TrendIcon = cfg.icon;

  // Merge history + forecast for chart
  const today = new Date().toISOString().split("T")[0];
  const combined = [
    ...history.map(h => ({ date: h.date, actual: h.revenue })),
    ...forecast.map(f => ({ date: f.date, predicted: f.predicted })),
  ];

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center">
            <Brain size={15} className="text-rose-700" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">AI Revenue Forecast</h3>
            <p className="text-[11px] text-slate-400">30-day projection from last 90 days</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${cfg.bg} ${cfg.border} ${cfg.color}`}>
          <TrendIcon size={12} />
          {cfg.label}
          {growthRate !== 0 && <span>({growthRate > 0 ? "+" : ""}{growthRate}%)</span>}
        </div>
      </div>

      {loading ? (
        <div className="h-64 bg-slate-50 rounded-xl animate-pulse" />
      ) : combined.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-slate-400 text-sm">Insufficient data for forecast</div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={combined} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine x={today} stroke="#94a3b8" strokeDasharray="4 2" label={{ value: "Today", fontSize: 9, fill: "#94a3b8" }} />
            <Area type="monotone" dataKey="actual"    name="Actual Revenue"    fill="#d1fae5" stroke="#10b981" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="predicted" name="Predicted Revenue" stroke="#f43f5e" strokeWidth={2} dot={false} strokeDasharray="5 3" />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default RevenueForecast;
