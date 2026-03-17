import React from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Activity } from "lucide-react";

const SLICES = [
  { key: "paid",            label: "Paid",    color: "#10b981" },
  { key: "pending_payment", label: "Pending", color: "#f59e0b" },
  { key: "failed",          label: "Failed",  color: "#ef4444" },
  { key: "refunded",        label: "Refunded",color: "#94a3b8" },
];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700">{d.name}</p>
      <p style={{ color: d.payload.fill }}>{d.value} orders</p>
      <p className="text-slate-500">₹{d.payload.amount?.toLocaleString()}</p>
    </div>
  );
};

const PaymentStatus = ({ data, loading }) => {
  const chartData = SLICES.map(s => ({
    name:   s.label,
    value:  data?.[s.key]?.count  || 0,
    amount: data?.[s.key]?.amount || 0,
    fill:   s.color,
  })).filter(d => d.value > 0);

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
          <Activity size={15} className="text-blue-700" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Payment Status</h3>
          {data?.successRate != null && (
            <p className="text-[11px] text-emerald-600 font-medium">{data.successRate}% success rate</p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="h-52 bg-slate-50 rounded-xl animate-pulse" />
      ) : chartData.length === 0 ? (
        <div className="h-52 flex items-center justify-center text-slate-400 text-sm">No data</div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {SLICES.map(s => (
              <div key={s.key} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="text-[11px] text-slate-600">{s.label}</span>
                <span className="text-[11px] font-semibold text-slate-800 ml-auto">{data?.[s.key]?.count || 0}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default PaymentStatus;
