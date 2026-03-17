import { motion } from "framer-motion";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { BarChart2, Loader2 } from "lucide-react";

const tooltipStyle = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, color: "#1e293b", fontSize: 12 };

export default function PlatformAnalytics({ data, isLoading }) {
  if (isLoading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 h-64 flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
      </motion.div>
    );
  }

  const merged = (data?.farmerGrowth || []).map((f, i) => ({
    month: f.month,
    farmers: f.count,
    orders: data?.orderGrowth?.[i]?.count || 0,
    revenue: Math.round((data?.revenueGrowth?.[i]?.revenue || 0) / 1000)
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <BarChart2 size={18} className="text-emerald-600" />
          <h2 className="text-slate-800 font-semibold text-base">Platform Performance Analytics</h2>
          <span className="ml-auto text-xs text-slate-400">Last 6 months</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <p className="text-xs text-slate-500 mb-3">Farmer Growth & Orders</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={merged}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
              <Line type="monotone" dataKey="farmers" stroke="#059669" strokeWidth={2} dot={false} name="Farmers" />
              <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} dot={false} name="Orders" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-3">Revenue Growth (₹K)</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={merged}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`₹${v}K`, "Revenue"]} />
              <Bar dataKey="revenue" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}
