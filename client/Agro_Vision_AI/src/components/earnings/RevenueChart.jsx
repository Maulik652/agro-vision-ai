import React, { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

const PERIODS = ["daily", "weekly", "monthly"];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: ₹{Number(p.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
};

const RevenueChart = ({ data = [], loading, period, onPeriodChange }) => (
  <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
          <TrendingUp size={15} className="text-emerald-700" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Revenue Trends</h3>
          <p className="text-[11px] text-slate-400">{data.length} data points</p>
        </div>
      </div>
      <div className="flex gap-1">
        {PERIODS.map(p => (
          <button key={p} onClick={() => onPeriodChange(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              period === p ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}>
            {p}
          </button>
        ))}
      </div>
    </div>

    {loading ? (
      <div className="h-64 bg-slate-50 rounded-xl animate-pulse" />
    ) : data.length === 0 ? (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No data available</div>
    ) : (
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="revenue"    name="Revenue"     stroke="#10b981" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="commission" name="Commission"  stroke="#8b5cf6" strokeWidth={2} dot={false} strokeDasharray="4 2" />
          <Line type="monotone" dataKey="farmerPayout" name="Farmer Payout" stroke="#3b82f6" strokeWidth={2} dot={false} strokeDasharray="4 2" />
        </LineChart>
      </ResponsiveContainer>
    )}
  </div>
);

export default RevenueChart;
