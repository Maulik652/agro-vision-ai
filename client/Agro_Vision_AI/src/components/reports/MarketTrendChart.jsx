import React, { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

const COLORS = ["#10b981","#3b82f6","#f59e0b","#8b5cf6","#ef4444","#06b6d4"];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-500">{p.name}</span>
          <span className="font-semibold text-slate-800 ml-auto pl-4">₹{p.value}</span>
        </div>
      ))}
    </div>
  );
};

const MarketTrendChart = ({ data = [], loading }) => {
  const { chartData, crops } = useMemo(() => {
    const byDate = {};
    const cropSet = new Set();
    data.forEach(({ date, crop, avgPrice }) => {
      if (!byDate[date]) byDate[date] = { date };
      byDate[date][crop] = avgPrice;
      cropSet.add(crop);
    });
    return {
      chartData: Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)),
      crops: [...cropSet].slice(0, 6)
    };
  }, [data]);

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-emerald-600" />
          <h3 className="font-semibold text-slate-800 text-sm">Market Price Trends</h3>
        </div>
        <span className="text-[11px] text-slate-400 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">{crops.length} crops tracked</span>
      </div>
      <div className="p-6">
        {loading ? (
          <div className="h-72 bg-slate-50 rounded-xl animate-pulse" />
        ) : chartData.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-slate-400">
            <TrendingUp size={32} className="mb-2 opacity-20" />
            <p className="text-sm">No trend data available</p>
            <p className="text-xs mt-1">Add crop price history to see trends</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={d => d.slice(5)} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={v => `₹${v}`} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
              {crops.map((crop, i) => (
                <Line key={crop} type="monotone" dataKey={crop} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default MarketTrendChart;
