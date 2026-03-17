import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, CheckCircle, XCircle, Loader2, ChevronDown } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { acceptConsultation, rejectConsultation } from "../../api/consultationApi";
import toast from "react-hot-toast";

const STATUS_STYLE = {
  pending:     "bg-yellow-100 text-yellow-700 border-yellow-200",
  accepted:    "bg-blue-100 text-blue-700 border-blue-200",
  scheduled:   "bg-purple-100 text-purple-700 border-purple-200",
  in_progress: "bg-cyan-100 text-cyan-700 border-cyan-200",
  completed:   "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected:    "bg-red-100 text-red-700 border-red-200"
};

const PRIORITY_STYLE = {
  low:    "text-slate-400",
  medium: "text-yellow-600",
  high:   "text-orange-600",
  urgent: "text-red-600"
};

const PAYMENT_STYLE = {
  pending: "text-yellow-600",
  paid:    "text-emerald-600",
  failed:  "text-red-600"
};

export default function ConsultationRequestsTable({ data = [], isLoading, onView, statusFilter, onStatusFilter }) {
  const qc = useQueryClient();
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const acceptMut = useMutation({
    mutationFn: acceptConsultation,
    onSuccess: () => { toast.success("Consultation accepted"); qc.invalidateQueries({ queryKey: ["consultations"] }); },
    onError: (e) => toast.error(e?.response?.data?.message || "Failed")
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }) => rejectConsultation(id, reason),
    onSuccess: () => { toast.success("Consultation rejected"); setRejectId(null); setRejectReason(""); qc.invalidateQueries({ queryKey: ["consultations"] }); },
    onError: (e) => toast.error(e?.response?.data?.message || "Failed")
  });

  const STATUS_OPTIONS = ["", "pending", "accepted", "scheduled", "in_progress", "completed", "rejected"];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">

      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="text-slate-800 font-semibold text-base">Incoming Consultation Requests</h2>
        <select value={statusFilter} onChange={(e) => onStatusFilter(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-1.5 outline-none">
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s ? s.replace("_", " ") : "All Status"}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="h-40 flex items-center justify-center"><Loader2 className="animate-spin text-emerald-600" size={28} /></div>
      ) : data.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No consultation requests</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Request ID", "User", "Crop Type", "Category", "Priority", "Date", "Payment", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left text-xs text-slate-400 font-medium pb-3 pr-4 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <motion.tr key={row._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="border-b border-slate-50 hover:bg-slate-50 transition">
                  <td className="py-3 pr-4 text-slate-400 text-xs font-mono">#{String(row._id).slice(-6).toUpperCase()}</td>
                  <td className="py-3 pr-4 text-slate-800 font-medium whitespace-nowrap">{row.user?.name || "—"}</td>
                  <td className="py-3 pr-4 text-slate-600 whitespace-nowrap">{row.cropType}</td>
                  <td className="py-3 pr-4 text-slate-500 capitalize whitespace-nowrap">{row.problemCategory}</td>
                  <td className={`py-3 pr-4 capitalize font-medium whitespace-nowrap ${PRIORITY_STYLE[row.priority]}`}>{row.priority}</td>
                  <td className="py-3 pr-4 text-slate-400 text-xs whitespace-nowrap">
                    {new Date(row.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                  </td>
                  <td className={`py-3 pr-4 capitalize text-xs font-medium whitespace-nowrap ${PAYMENT_STYLE[row.paymentStatus]}`}>
                    {row.paymentStatus}{row.consultationFee > 0 ? ` · ₹${row.consultationFee}` : ""}
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLE[row.status] || ""}`}>
                      {row.status?.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => onView(row)} title="View"
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 transition">
                        <Eye size={13} />
                      </button>
                      {row.status === "pending" && (
                        <>
                          <button onClick={() => acceptMut.mutate(row._id)} disabled={acceptMut.isPending} title="Accept"
                            className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition">
                            {acceptMut.isPending && acceptMut.variables === row._id
                              ? <Loader2 size={13} className="animate-spin" />
                              : <CheckCircle size={13} />}
                          </button>
                          <button onClick={() => setRejectId(row._id)} title="Reject"
                            className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition">
                            <XCircle size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject modal */}
      <AnimatePresence>
        {rejectId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-slate-900 font-semibold mb-4">Reject Consultation</h3>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection (optional)..." rows={3}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl px-4 py-2.5 text-sm outline-none resize-none mb-4" />
              <div className="flex gap-3">
                <button onClick={() => setRejectId(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition">Cancel</button>
                <button onClick={() => rejectMut.mutate({ id: rejectId, reason: rejectReason })} disabled={rejectMut.isPending}
                  className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition disabled:opacity-60">
                  {rejectMut.isPending ? "Rejecting..." : "Confirm Reject"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
