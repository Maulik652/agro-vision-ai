import React from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { BarChart2, Star } from "lucide-react";
import StarRating from "./StarRating.jsx";

const BAR_COLORS = ["#ef4444","#f97316","#f59e0b","#84cc16","#10b981"];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map(p => <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {p.value}</p>)}
    </div>
  );
};

const ReviewAnalytics = ({ data, loading }) => {
  const dist      = data?.distribution || [];
  const trend     = data?.trend        || [];
  const topFarmers = data?.topFarmers  || [];

  if (loading) return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {[1,2,3].map(i => <div key={i} className="h-64 bg-slate-50 rounded-2xl animate-pulse" />)}
    </div>
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Rating distribution */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
            <Star size={15} className="text-amber-700" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">Rating Distribution</h3>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={dist} layout="vertical" margin={{ left: 8, right: 8 }}>
            <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="rating" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={v => `${v}★`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" name="Reviews" radius={[0, 4, 4, 0]}>
              {dist.map((_, i) => <Cell key={i} fill={BAR_COLORS[i]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Rating trend */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
            <BarChart2 size={15} className="text-emerald-700" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">Rating Trend</h3>
        </div>
        {trend.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-slate-400 text-sm">No trend data</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis domain={[1, 5]} tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="avgRating" name="Avg Rating" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top rated */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
            <Star size={15} className="text-violet-700" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">Top Rated Users</h3>
        </div>
        <div className="space-y-3">
          {topFarmers.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">No data</p>
          ) : topFarmers.map((f, i) => (
            <div key={f.userId} className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400 w-4">#{i + 1}</span>
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700 shrink-0">
                {f.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">{f.name}</p>
                <p className="text-[10px] text-slate-400 capitalize">{f.role}</p>
              </div>
              <div className="text-right shrink-0">
                <StarRating rating={f.avgRating} size={11} />
                <p className="text-[10px] text-slate-400">{f.count} reviews</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReviewAnalytics;
