import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { MessageSquare, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { fetchAdminConsultations, fetchConsultationStats, updateConsultationStatus } from "../../api/adminApi";
import toast from "react-hot-toast";

const STATUS_BADGE = {
  pending:     "bg-amber-100 text-amber-700",
  accepted:    "bg-blue-100 text-blue-700",
  scheduled:   "bg-purple-100 text-purple-700",
  in_progress: "bg-indigo-100 text-indigo-700",
  completed:   "bg-green-100 text-green-700",
  rejected:    "bg-red-100 text-red-700",
};

const PRIORITY_DOT = { low: "bg-slate-400", medium: "bg-amber-400", high: "bg-orange-500", urgent: "bg-red-600" };

export default function ConsultationsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const { data: stats } = useQuery({ queryKey: ["admin-consult-stats"], queryFn: fetchConsultationStats });
  const { data, isLoading } = useQuery({
    queryKey: ["admin-consultations", { status, page }],
    queryFn: () => fetchAdminConsultations({ status, page, limit: 20 }),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status: s }) => updateConsultationStatus(id, s),
    onSuccess: () => { qc.invalidateQueries(["admin-consultations"]); qc.invalidateQueries(["admin-consult-stats"]); toast.success("Updated"); },
    onError: () => toast.error("Failed"),
  });

  const consultations = data?.data || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  const STAT_CARDS = [
    { label: "Total", value: stats?.total || 0, icon: MessageSquare, color: "from-blue-500 to-indigo-600" },
    { label: "Pending", value: stats?.pending || 0, icon: Clock, color: "from-amber-500 to-orange-500" },
    { label: "In Progress", value: stats?.inProgress || 0, icon: AlertTriangle, color: "from-purple-500 to-violet-600" },
    { label: "Completed", value: stats?.completed || 0, icon: CheckCircle, color: "from-green-500 to-emerald-600" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
          Consultation Management
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">{total} total consultations across all experts</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STAT_CARDS.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className={`rounded-2xl bg-gradient-to-br ${c.color} p-4 text-white`}>
            <c.icon size={18} className="mb-2 opacity-80" />
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-xs opacity-80 mt-0.5">{c.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Revenue highlight */}
      {stats?.revenue > 0 && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-3 flex items-center gap-3">
          <span className="text-emerald-700 font-semibold text-sm">Total Consultation Revenue:</span>
          <span className="text-emerald-800 font-bold">₹{stats.revenue.toLocaleString("en-IN")}</span>
        </div>
      )}

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {["", "pending", "accepted", "scheduled", "in_progress", "completed", "rejected"].map((s) => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition ${
              status === s ? "bg-green-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}>
            {s || "All"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {["Expert", "User", "Crop", "Category", "Priority", "Fee", "Status", "Date", "Action"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                    ))}</tr>
                  ))
                : consultations.map((c) => (
                    <motion.tr key={c._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-medium text-slate-800">{c.expert?.name || "—"}</td>
                      <td className="px-4 py-3 text-slate-500">{c.user?.name || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{c.cropType}</td>
                      <td className="px-4 py-3 text-slate-500 capitalize">{c.problemCategory}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[c.priority] || "bg-slate-400"}`} />
                          <span className="text-xs capitalize text-slate-600">{c.priority}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">₹{c.consultationFee || 0}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_BADGE[c.status] || "bg-slate-100 text-slate-600"}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <select value={c.status}
                          onChange={(e) => statusMut.mutate({ id: c._id, status: e.target.value })}
                          className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-white outline-none">
                          {["pending","accepted","scheduled","in_progress","completed","rejected"].map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                    </motion.tr>
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
