import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Play, CheckCircle, AlertOctagon, Lightbulb, Loader2, ChevronDown, X
} from "lucide-react";
import {
  startActiveConsultation,
  completeActiveConsultation,
  escalateActiveConsultation,
  postActiveRecommendation
} from "../../api/consultationApi";
import toast from "react-hot-toast";

export default function ExpertActionsPanel({ consultation, consultationId, onStatusChange }) {
  const qc = useQueryClient();
  const [showRec, setShowRec]         = useState(false);
  const [showEscalate, setShowEscalate] = useState(false);
  const [escalateReason, setEscalateReason] = useState("");
  const [rec, setRec] = useState({
    treatmentAdvice: "", fertilizerSuggestion: "", marketGuidance: "",
    followUpRequired: false, followUpDate: ""
  });

  const status = consultation?.status;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["active-detail", consultationId] });
    qc.invalidateQueries({ queryKey: ["active-consultations"] });
    onStatusChange?.();
  };

  const startMut = useMutation({
    mutationFn: () => startActiveConsultation(consultationId),
    onSuccess: () => { toast.success("Session started"); invalidate(); },
    onError: (e) => toast.error(e?.response?.data?.message || "Failed to start")
  });

  const completeMut = useMutation({
    mutationFn: () => completeActiveConsultation(consultationId),
    onSuccess: () => { toast.success("Consultation completed"); invalidate(); },
    onError: (e) => toast.error(e?.response?.data?.message || "Failed to complete")
  });

  const escalateMut = useMutation({
    mutationFn: () => escalateActiveConsultation(consultationId, escalateReason),
    onSuccess: () => { toast.success("Escalated to admin"); setShowEscalate(false); invalidate(); },
    onError: (e) => toast.error(e?.response?.data?.message || "Failed to escalate")
  });

  const recMut = useMutation({
    mutationFn: () => postActiveRecommendation(consultationId, rec),
    onSuccess: () => { toast.success("Recommendation saved"); setShowRec(false); invalidate(); },
    onError: (e) => toast.error(e?.response?.data?.message || "Failed to save")
  });

  if (!consultation) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-50">
        <p className="text-xs font-semibold text-slate-900">Actions</p>
      </div>

      <div className="p-4 space-y-2">
        {/* Start */}
        {status === "scheduled" && (
          <button onClick={() => startMut.mutate()} disabled={startMut.isPending}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition disabled:opacity-60">
            {startMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Start Session
          </button>
        )}

        {/* Recommendation */}
        {status === "in_progress" && (
          <button onClick={() => setShowRec(v => !v)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 text-sm font-medium transition">
            <Lightbulb size={14} />
            {consultation.recommendation ? "Update Recommendation" : "Add Recommendation"}
          </button>
        )}

        {/* Complete */}
        {status === "in_progress" && (
          <button onClick={() => completeMut.mutate()} disabled={completeMut.isPending}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 hover:bg-sky-100 text-sm font-medium transition disabled:opacity-60">
            {completeMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            Mark Complete
          </button>
        )}

        {/* Escalate */}
        {["scheduled", "in_progress"].includes(status) && (
          <button onClick={() => setShowEscalate(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 text-sm font-medium transition">
            <AlertOctagon size={14} />
            Escalate Case
          </button>
        )}

        {/* Status badges */}
        {status === "completed" && (
          <div className="flex items-center justify-center gap-2 py-3 text-emerald-600 text-sm">
            <CheckCircle size={16} /> Session Completed
          </div>
        )}
        {status === "escalated" && (
          <div className="flex items-center justify-center gap-2 py-3 text-red-500 text-sm">
            <AlertOctagon size={16} /> Escalated to Admin
          </div>
        )}
      </div>

      {/* Recommendation form */}
      <AnimatePresence>
        {showRec && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-slate-100">
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-700">Recommendation</p>
                <button onClick={() => setShowRec(false)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
              </div>
              {[
                { key: "treatmentAdvice", label: "Treatment Advice", rows: 3, placeholder: "Describe treatment steps..." },
                { key: "fertilizerSuggestion", label: "Fertilizer Suggestion", rows: 2, placeholder: "NPK ratios, schedule..." },
                { key: "marketGuidance", label: "Market Guidance", rows: 2, placeholder: "Best time to sell, storage..." }
              ].map(({ key, label, rows, placeholder }) => (
                <div key={key}>
                  <label className="text-[10px] text-slate-400 block mb-1">{label}</label>
                  <textarea value={rec[key]} onChange={(e) => setRec(r => ({ ...r, [key]: e.target.value }))}
                    rows={rows} placeholder={placeholder}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-400 transition resize-none" />
                </div>
              ))}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={rec.followUpRequired}
                  onChange={(e) => setRec(r => ({ ...r, followUpRequired: e.target.checked }))}
                  className="w-3.5 h-3.5 accent-emerald-500" />
                <span className="text-xs text-slate-600">Follow-up required</span>
              </label>
              {rec.followUpRequired && (
                <input type="date" value={rec.followUpDate} onChange={(e) => setRec(r => ({ ...r, followUpDate: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 py-2 text-xs outline-none" />
              )}
              <button onClick={() => recMut.mutate()} disabled={recMut.isPending}
                className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium transition disabled:opacity-60 flex items-center justify-center gap-2">
                {recMut.isPending && <Loader2 size={12} className="animate-spin" />}
                Save Recommendation
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Escalate modal */}
      <AnimatePresence>
        {showEscalate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertOctagon size={18} className="text-red-600" />
                </div>
                <h3 className="text-slate-900 font-semibold">Escalate Case</h3>
              </div>
              <p className="text-xs text-slate-500 mb-3">This will move the case to admin review. Provide a reason.</p>
              <textarea value={escalateReason} onChange={(e) => setEscalateReason(e.target.value)}
                rows={3} placeholder="Reason for escalation..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-red-400 transition resize-none mb-4" />
              <div className="flex gap-3">
                <button onClick={() => setShowEscalate(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition">Cancel</button>
                <button onClick={() => escalateMut.mutate()} disabled={escalateMut.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition disabled:opacity-60 flex items-center justify-center gap-2">
                  {escalateMut.isPending && <Loader2 size={13} className="animate-spin" />}
                  Escalate
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
