import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { MapPin } from "lucide-react";

const COLORS = ["#10b981","#3b82f6","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#f97316","#84cc16","#ec4899","#14b8a6"];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs min-w-[140px]">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4"><span className="text-slate-500">Listings</span><span className="font-semibold">{d?.listings || 0}</span></div>
        <div className="flex justify-between gap-4"><span className="text-slate-500">Revenue</span><span className="font-semibold">₹{(d?.revenue || 0).toLocaleString()}</span></div>
        <div className="flex justify-between gap-4"><span className="text-slate-500">Avg Price</span><span className="font-semibold">₹{(d?.avgPrice || 0).toLocaleString()}</span></div>
      </div>
    </div>
  );
};

const RegionMap = ({ data = [], loading }) => {
  const chartData = data.slice(0, 10).map(d => ({
    region: d.region || "Unknown",
    listings: d.listings,
    revenue: d.revenue,
    avgPrice: d.avgPrice
  }));

  const topRegion = chartData[0];

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-violet-600" />
          <h3 className="font-semibold text-slate-800 text-sm">Regional Analytics</h3>
        </div>
        {topRegion && !loading && (
          <span className="text-[11px] text-violet-700 bg-violet-50 border border-violet-200 px-2 py-1 rounded-lg font-medium">
            Top: {topRegion.region}
          </span>
        )}
      </div>
      <div className="p-6">
        {loading ? (
          <div className="h-72 bg-slate-50 rounded-xl animate-pulse" />
        ) : chartData.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-slate-400">
            <MapPin size={32} className="mb-2 opacity-20" />
            <p className="text-sm">No regional data</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="region" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
                <Bar dataKey="listings" radius={[4,4,0,0]} maxBarSize={36}>
                  {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Legend table */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {chartData.slice(0, 6).map((d, i) => (
                <div key={d.region} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-slate-600 truncate flex-1">{d.region}</span>
                  <span className="font-semibold text-slate-800 shrink-0">{d.listings}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RegionMap;
