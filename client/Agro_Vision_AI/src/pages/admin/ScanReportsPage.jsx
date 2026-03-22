import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { fetchScanReportsDeep } from "../../api/adminApi";
import { Search, Activity } from "lucide-react";

const HEALTH_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e"];
const HEALTH_LABELS = ["Critical (0-25)", "Poor (25-50)", "Fair (50-75)", "Good (75-100)"];

export default function ScanReportsPage() {
  const [cropType, setCropType] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-scan-reports", { cropType, page }],
    queryFn: () => fetchScanReportsDeep({ cropType, page, limit: 20 }),
  });

  const reports = data?.data?.reports || [];
  const topIssues = (data?.data?.topIssues || []).filter((t) => t._id);
  const healthDist = (data?.data?.healthDist || []).map((d, i) => ({
    name: HEALTH_LABELS[i] || "Excellent",
    value: d.count,
  }));
  const riskStats = data?.data?.riskStats || {};
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
          AI Scan Reports
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">{total} total crop scans analyzed</p>
      </div>

      {/* Risk Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-4 text-white">
          <Activity size={18} className="mb-2 opacity-80" />
          <p className="text-2xl font-bold">{riskStats.avgHealth ? riskStats.avgHealth.toFixed(1) : "—"}</p>
          <p className="text-xs opacity-80 mt-0.5">Avg Health Score</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 p-4 text-white">
          <Activity size={18} className="mb-2 opacity-80" />
          <p className="text-2xl font-bold">{riskStats.highDisease || 0}</p>
          <p className="text-xs opacity-80 mt-0.5">High Disease Risk</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 p-4 text-white">
          <Activity size={18} className="mb-2 opacity-80" />
          <p className="text-2xl font-bold">{riskStats.highPest || 0}</p>
          <p className="text-xs opacity-80 mt-0.5">High Pest Risk</p>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 mb-4 text-sm" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
            Top Detected Issues
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topIssues.map((t) => ({ name: t._id?.slice(0, 20), count: t.count }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Bar dataKey="count" fill="#ef4444" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 mb-4 text-sm" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
            Health Score Distribution
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={healthDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${value}`}>
                {healthDist.map((_, i) => <Cell key={i} fill={HEALTH_COLORS[i % HEALTH_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {HEALTH_LABELS.map((l, i) => (
              <span key={l} className="flex items-center gap-1 text-[10px] text-slate-500">
                <span className="w-2 h-2 rounded-full" style={{ background: HEALTH_COLORS[i] }} />{l}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Filter + Table */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white max-w-sm">
        <Search size={14} className="text-slate-400" />
        <input value={cropType} onChange={(e) => { setCropType(e.target.value); setPage(1); }}
          placeholder="Filter by crop type..." className="flex-1 text-sm outline-none text-slate-700 placeholder:text-slate-400" />
      </div>

      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {["Farmer", "Crop", "Detected", "Issue", "Health", "Disease Risk", "Pest Risk", "Date"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                    ))}</tr>
                  ))
                : reports.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 text-slate-700">{r.user?.name || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{r.cropType}</td>
                      <td className="px-4 py-3 text-slate-600">{r.detectedCrop}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{r.primaryIssue}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full" style={{
                              width: `${r.healthScore}%`,
                              background: r.healthScore >= 75 ? "#22c55e" : r.healthScore >= 50 ? "#eab308" : r.healthScore >= 25 ? "#f97316" : "#ef4444"
                            }} />
                          </div>
                          <span className="text-xs font-semibold text-slate-700">{r.healthScore}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          r.riskSnapshot?.diseaseSpreadRisk === "High" ? "bg-red-100 text-red-700" :
                          r.riskSnapshot?.diseaseSpreadRisk === "Medium" ? "bg-amber-100 text-amber-700" :
                          "bg-green-100 text-green-700"
                        }`}>{r.riskSnapshot?.diseaseSpreadRisk || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          r.riskSnapshot?.pestSpreadRisk === "High" ? "bg-red-100 text-red-700" :
                          r.riskSnapshot?.pestSpreadRisk === "Medium" ? "bg-amber-100 text-amber-700" :
                          "bg-green-100 text-green-700"
                        }`}>{r.riskSnapshot?.pestSpreadRisk || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-400">Page {page} of {pages}</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Prev</button>
              <button disabled={page === pages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
