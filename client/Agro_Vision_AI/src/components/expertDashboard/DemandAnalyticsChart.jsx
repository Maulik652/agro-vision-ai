import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { BarChart2, Loader2 } from "lucide-react";

const COLORS = ["#34d399", "#10b981", "#059669", "#047857", "#065f46", "#064e3b", "#022c22", "#6ee7b7", "#a7f3d0", "#d1fae5"];

export default function DemandAnalyticsChart({ data = [], isLoading }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6"
    >
      <div className="flex items-center gap-2 mb-5">
        <BarChart2 size={18} className="text-cyan-600" />
        <h2 className="text-slate-800 font-semibold text-base">Marketplace Demand Analytics</h2>
      </div>

      {isLoading ? (
        <div className="h-52 flex items-center justify-center">
          <Loader2 className="animate-spin text-cyan-500" size={28} />
        </div>
      ) : data.length === 0 ? (
        <div className="h-52 flex items-center justify-center text-slate-400 text-sm">No demand data</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="crop" tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, color: "#1e293b", fontSize: 12 }}
              formatter={(v) => [v, "Qty (kg)"]}
            />
            <Bar dataKey="totalQuantity" radius={[6, 6, 0, 0]}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  );
}
