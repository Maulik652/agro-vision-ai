import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { BarChart2 } from "lucide-react";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const supply = payload.find(p => p.dataKey === "Supply")?.value || 0;
  const demand = payload.find(p => p.dataKey === "Demand")?.value || 0;
  const gap = demand - supply;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs min-w-[140px]">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4"><span className="text-emerald-600">Supply</span><span className="font-semibold">{supply.toLocaleString()}</span></div>
        <div className="flex justify-between gap-4"><span className="text-blue-600">Demand</span><span className="font-semibold">{demand.toLocaleString()}</span></div>
        <div className={`flex justify-between gap-4 pt-1 border-t border-slate-100 ${gap > 0 ? "text-red-500" : "text-emerald-600"}`}>
          <span>Gap</span><span className="font-semibold">{gap > 0 ? `+${gap.toLocaleString()}` : gap.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

const DemandSupplyChart = ({ data = [], loading }) => {
  const chartData = data.slice(0, 12).map(d => ({ crop: d.crop, Supply: d.supply, Demand: d.demand }));
  const gapCount = data.filter(d => d.gap > 0).length;

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <BarChart2 size={16} className="text-blue-600" />
          <h3 className="font-semibold text-slate-800 text-sm">Demand vs Supply</h3>
        </div>
        {!loading && data.length > 0 && (
          <span className={`text-[11px] font-medium px-2 py-1 rounded-lg border ${gapCount > 0 ? "bg-red-50 border-red-200 text-red-600" : "bg-emerald-50 border-emerald-200 text-emerald-600"}`}>
            {gapCount} crops undersupplied
          </span>
        )}
      </div>
      <div className="p-6">
        {loading ? (
          <div className="h-72 bg-slate-50 rounded-xl animate-pulse" />
        ) : chartData.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-slate-400">
            <BarChart2 size={32} className="mb-2 opacity-20" />
            <p className="text-sm">No demand/supply data</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="crop" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
              <Bar dataKey="Supply" fill="#10b981" radius={[4,4,0,0]} maxBarSize={32} />
              <Bar dataKey="Demand" fill="#3b82f6" radius={[4,4,0,0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default DemandSupplyChart;
