import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { fetchAIStats } from "../../api/adminApi";
import { BrainCircuit, Activity, CheckCircle } from "lucide-react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function AIInsightsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-ai-stats"],
    queryFn: fetchAIStats,
    refetchInterval: 60000,
  });

  const scanChart = (data?.scansByMonth || []).map((s) => ({
    name: MONTHS[(s._id?.month || 1) - 1],
    scans: s.count,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
          AI Control Panel
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Monitor all AI models and their performance</p>
      </div>

      {/* Total Scans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-5 text-white"
        >
          <BrainCircuit size={24} className="mb-3 opacity-80" />
          <p className="text-3xl font-bold">{(data?.totalScans || 0).toLocaleString("en-IN")}</p>
          <p className="text-sm opacity-80 mt-1">Total AI Scans</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-5 text-white"
        >
          <Activity size={24} className="mb-3 opacity-80" />
          <p className="text-3xl font-bold">{data?.models?.length || 5}</p>
          <p className="text-sm opacity-80 mt-1">Active AI Models</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 p-5 text-white"
        >
          <CheckCircle size={24} className="mb-3 opacity-80" />
          <p className="text-3xl font-bold">91.2%</p>
          <p className="text-sm opacity-80 mt-1">Avg Accuracy</p>
        </motion.div>
      </div>

      {/* Models Table */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-sm" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
            AI Model Performance
          </h3>
        </div>
        <div className="divide-y divide-slate-50">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-4">
                  <div className="h-4 w-48 bg-slate-100 rounded animate-pulse" />
                  <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
                  <div className="h-4 flex-1 bg-slate-100 rounded animate-pulse" />
                </div>
              ))
            : (data?.models || []).map((m, i) => (
                <motion.div
                  key={m.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="px-5 py-4 flex items-center gap-4"
                >
                  <div className="flex-1">
                    <p className="font-medium text-slate-800 text-sm">{m.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{m.usage.toLocaleString("en-IN")} uses</p>
                  </div>
                  <div className="text-right w-20">
                    <p className="font-bold text-slate-800 text-sm">{m.accuracy}%</p>
                    <p className="text-xs text-slate-400">accuracy</p>
                  </div>
                  <div className="w-32">
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${m.accuracy}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400"
                      />
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                    {m.status}
                  </span>
                </motion.div>
              ))}
        </div>
      </div>

      {/* Scans Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5"
      >
        <h3 className="font-bold text-slate-800 mb-4 text-sm" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
          AI Scans by Month
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={scanChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
            <Bar dataKey="scans" fill="#16a34a" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}
