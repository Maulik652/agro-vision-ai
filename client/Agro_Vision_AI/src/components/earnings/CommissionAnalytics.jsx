import React, { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Percent } from "lucide-react";

const VIEWS = [
  { key: "byCrop",   label: "By Crop",   dataKey: "crop"   },
  { key: "byMethod", label: "By Method", dataKey: "method" },
  { key: "byRegion", label: "By Region", dataKey: "region" },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      <p className="text-violet-700">Commission: ₹{Number(payload[0]?.value || 0).toLocaleString()}</p>
      <p className="text-emerald-700">Revenue: ₹{Number(payload[1]?.value || 0).toLocaleString()}</p>
    </div>
  );
};

const CommissionAnalytics = ({ data = {}, loading }) => {
  const [view, setView] = useState("byCrop");
  const current = VIEWS.find(v => v.key === view);
  const chartData = data[view] || [];

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
            <Percent size={15} className="text-violet-700" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">Commission Analytics</h3>
        </div>
        <div className="flex gap-1">
          {VIEWS.map(v => (
            <button key={v.key} onClick={() => setView(v.key)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                view === v.key ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-56 bg-slate-50 rounded-xl animate-pulse" />
      ) : chartData.length === 0 ? (
        <div className="h-56 flex items-center justify-center text-slate-400 text-sm">No data</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey={current.dataKey} tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="commission" name="Commission" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="revenue"    name="Revenue"    fill="#d8b4fe" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default CommissionAnalytics;
