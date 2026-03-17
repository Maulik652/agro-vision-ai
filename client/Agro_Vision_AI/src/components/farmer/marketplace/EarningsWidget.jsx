import { motion } from "framer-motion";
import { BarChart3, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Loader2, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getEarnings } from "../../../api/farmerMarketplaceApi";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const fmt = (v) => {
  const n = Number(v);
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="text-sm font-black text-emerald-700">{fmt(payload[0]?.value)}</p>
      {payload[1] && <p className="text-[10px] text-blue-600">{payload[1]?.value} orders</p>}
    </div>
  );
};

export default function EarningsWidget({ compact = false, onTabSwitch }) {
  const { data, isLoading } = useQuery({
    queryKey: ["farmerEarnings"],
    queryFn: getEarnings,
    staleTime: 60000,
    retry: 1,
  });

  const earnings = data?.earnings || data || {};
  const monthly = earnings.monthly || [];
  const cropBreakdown = earnings.cropBreakdown || [];

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-xl bg-slate-200 animate-pulse" />
          <div className="h-4 w-28 rounded bg-slate-200 animate-pulse" />
        </div>
        <div className="h-40 rounded-xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${compact ? "p-4" : "p-6"}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100"><BarChart3 size={15} className="text-emerald-600" /></div>
          <div>
            <h3 className="text-sm font-black text-slate-800">Earnings</h3>
            <p className="text-[10px] text-slate-500">Revenue overview</p>
          </div>
        </div>
        {compact && onTabSwitch && (
          <button onClick={onTabSwitch} className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition">
            Details <ChevronRight size={12} />
          </button>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Total Revenue", value: fmt(earnings.totalRevenue || 0), icon: DollarSign, color: "text-emerald-700", bg: "bg-emerald-50" },
          { label: "Total Orders", value: earnings.totalOrders || 0, icon: ShoppingCart, color: "text-blue-700", bg: "bg-blue-50" },
          { label: "Avg Order", value: fmt(earnings.avgOrderValue || 0), icon: TrendingUp, color: "text-violet-700", bg: "bg-violet-50" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl ${s.bg} p-3`}>
            <p className={`text-base font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Bar Chart */}
      {monthly.length > 0 && (
        <div className={compact ? "h-32" : "h-48"}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} tickFormatter={(v) => fmt(v).replace("₹", "")} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Crop Breakdown */}
      {!compact && cropBreakdown.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold text-slate-700">Revenue by Crop</p>
          <div className="space-y-2">
            {cropBreakdown.map((c) => {
              const pct = earnings.totalRevenue > 0 ? Math.round((c.revenue / earnings.totalRevenue) * 100) : 0;
              return (
                <div key={c.crop} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{c.crop}</span>
                    <span className="font-black text-emerald-700">{fmt(c.revenue)}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className="h-full rounded-full bg-emerald-500" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
