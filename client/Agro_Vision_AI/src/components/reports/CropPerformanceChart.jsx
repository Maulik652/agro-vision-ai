import React, { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Sprout } from "lucide-react";

const METRICS = [
  { key: "totalRevenue", label: "Revenue",      fmt: v => `₹${(v||0).toLocaleString()}`, color: "#10b981" },
  { key: "totalVolume",  label: "Volume (kg)",  fmt: v => (v||0).toLocaleString(),        color: "#3b82f6" },
  { key: "totalOrders",  label: "Orders",       fmt: v => (v||0).toLocaleString(),        color: "#8b5cf6" },
  { key: "avgPrice",     label: "Avg Price",    fmt: v => `₹${(v||0).toLocaleString()}`,  color: "#f59e0b" }
];

const CustomTooltip = ({ active, payload, label, fmt }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      <p className="text-slate-800 font-bold">{fmt(payload[0]?.value)}</p>
    </div>
  );
};

const CropPerformanceChart = ({ data = [], loading }) => {
  const [metric, setMetric] = useState("totalRevenue");
  const m = METRICS.find(x => x.key === metric);
  const chartData = data.slice(0, 10).map(d => ({ name: d.crop, value: d[metric] || 0 }));

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Sprout size={16} className="text-emerald-600" />
          <h3 className="font-semibold text-slate-800 text-sm">Crop Performance</h3>
        </div>
        <div className="flex gap-1">
          {METRICS.map(mx => (
            <button key={mx.key} onClick={() => setMetric(mx.key)}
              className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors font-medium ${
                metric === mx.key ? "bg-emerald-100 text-emerald-700" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              }`}>
              {mx.label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-6">
        {loading ? (
          <div className="h-72 bg-slate-50 rounded-xl animate-pulse" />
        ) : chartData.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-slate-400">
            <Sprout size={32} className="mb-2 opacity-20" />
            <p className="text-sm">No crop performance data</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 24, left: 48, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={v => m.fmt(v)} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} width={60} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip fmt={m.fmt} />} cursor={{ fill: "#f8fafc" }} />
              <Bar dataKey="value" radius={[0,4,4,0]} maxBarSize={22}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={m.color} fillOpacity={1 - i * 0.06} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default CropPerformanceChart;
