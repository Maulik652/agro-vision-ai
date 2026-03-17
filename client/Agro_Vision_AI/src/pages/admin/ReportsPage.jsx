import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { fetchReports } from "../../api/adminApi";
import { Download } from "lucide-react";

export default function ReportsPage() {
  const [type, setType] = useState("revenue");
  const [period, setPeriod] = useState("monthly");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reports", { type, period }],
    queryFn: () => fetchReports({ type, period }),
  });

  const chartData = (data?.data || []).map((d) => ({
    name: d._id,
    value: d.revenue || d.count || 0,
    count: d.count || 0,
  }));

  const handleExport = () => {
    const csv = ["Date,Value", ...chartData.map((d) => `${d.name},${d.value}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agrovision-${type}-${period}-report.csv`;
    a.click();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
            Analytics & Reports Lab
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Deep data insights and exportable reports</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-2">
          {["revenue", "users", "orders"].map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition ${
                type === t ? "bg-green-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {["weekly", "monthly", "yearly"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition ${
                period === p ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <motion.div
        key={`${type}-${period}`}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5"
      >
        <h3 className="font-bold text-slate-800 mb-4 text-sm capitalize" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
          {type} — {period}
        </h3>
        {isLoading ? (
          <div className="h-56 bg-slate-100 rounded-xl animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            {type === "revenue" ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [`₹${v.toLocaleString("en-IN")}`, "Revenue"]} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Line type="monotone" dataKey="value" stroke="#16a34a" strokeWidth={2.5} dot={false} />
              </LineChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="value" fill="#16a34a" radius={[6, 6, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Data Table */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-sm" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
            Raw Data
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {type === "revenue" ? "Revenue" : "Count"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {chartData.map((d, i) => (
                <tr key={i} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 text-slate-600">{d.name}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {type === "revenue" ? `₹${d.value.toLocaleString("en-IN")}` : d.value.toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
              {chartData.length === 0 && (
                <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-400">No data for selected period</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
