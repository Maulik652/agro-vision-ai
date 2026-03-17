import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Users } from "lucide-react";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: p.color }} />{p.name}</span>
          <span className="font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

const UserAnalyticsChart = ({ data = [], loading }) => {
  const totalFarmers = data.reduce((s, d) => s + (d.newFarmers || 0), 0);
  const totalBuyers  = data.reduce((s, d) => s + (d.newBuyers  || 0), 0);

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-blue-600" />
          <h3 className="font-semibold text-slate-800 text-sm">User Growth & Engagement</h3>
        </div>
        {!loading && data.length > 0 && (
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg font-medium">+{totalFarmers} farmers</span>
            <span className="text-blue-600 bg-blue-50 border border-blue-200 px-2 py-1 rounded-lg font-medium">+{totalBuyers} buyers</span>
          </div>
        )}
      </div>
      <div className="p-6">
        {loading ? (
          <div className="h-72 bg-slate-50 rounded-xl animate-pulse" />
        ) : data.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-slate-400">
            <Users size={32} className="mb-2 opacity-20" />
            <p className="text-sm">No user data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="gFarmers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gBuyers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
              <Area type="monotone" dataKey="newFarmers" name="New Farmers" stroke="#10b981" fill="url(#gFarmers)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Area type="monotone" dataKey="newBuyers"  name="New Buyers"  stroke="#3b82f6" fill="url(#gBuyers)"  strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default UserAnalyticsChart;
