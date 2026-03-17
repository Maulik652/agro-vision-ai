import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Brain, Zap, Loader2, AlertTriangle, CheckCircle, TrendingUp, Leaf, ChevronDown } from "lucide-react";
import { triggerAIAnalysis } from "../../api/consultationApi";
import toast from "react-hot-toast";

const SEV_STYLE = {
  low:      "bg-emerald-50 border-emerald-200 text-emerald-700",
  medium:   "bg-amber-50 border-amber-200 text-amber-700",
  high:     "bg-orange-50 border-orange-200 text-orange-700",
  critical: "bg-red-50 border-red-200 text-red-700"
};

const ConfidenceBar = ({ value }) => (
  <div className="mt-1">
    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
      <span>Confidence</span>
      <span>{Math.round(value * 100)}%</span>
    </div>
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <motion.div initial={{ width: 0 }} animate={{ width: `${value * 100}%` }} transition={{ duration: 0.8 }}
        className={`h-full rounded-full ${value > 0.7 ? "bg-emerald-500" : value > 0.4 ? "bg-amber-500" : "bg-red-500"}`} />
    </div>
  </div>
);

export default function AIInsightsPanel({ consultation, consultationId }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(true);
  const insights = consultation?.aiAnalysis;

  const mutation = useMutation({
    mutationFn: () => triggerAIAnalysis(consultationId, {
      imageUrl: consultation?.images?.[0] || "",
      cropType: consultation?.cropType || "",
      description: consultation?.description || ""
    }),
    onSuccess: () => {
      toast.success("AI analysis complete");
      qc.invalidateQueries({ queryKey: ["active-detail", consultationId] });
    },
    onError: () => toast.error("AI analysis failed")
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition">
        <div className="flex items-center gap-2">
          <Brain size={14} className="text-purple-600" />
          <span className="text-xs font-semibold text-slate-900">AI Insights</span>
          {insights && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
        </div>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            className="overflow-hidden">
            <div className="px-4 pb-4 space-y-3 border-t border-slate-50">
              {!insights ? (
                <div className="pt-3 text-center">
                  <p className="text-xs text-slate-400 mb-3">No analysis yet. Trigger AI to analyze the crop issue.</p>
                  <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
                    className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium transition disabled:opacity-60">
                    {mutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                    {mutation.isPending ? "Analyzing..." : "Run AI Analysis"}
                  </button>
                </div>
              ) : (
                <>
                  <div className="pt-2 space-y-3">
                    {/* Disease */}
                    <div className={`p-3 rounded-xl border text-xs ${SEV_STYLE[insights.severity] || SEV_STYLE.low}`}>
                      <div className="flex items-center gap-1.5 font-semibold mb-1">
                        <AlertTriangle size={12} />
                        {insights.disease || "No disease detected"}
                      </div>
                      <ConfidenceBar value={insights.confidence || 0} />
                    </div>

                    {/* Treatment */}
                    {insights.treatment && (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 mb-1">
                          <CheckCircle size={12} /> Treatment
                        </div>
                        <p className="text-xs text-emerald-800 leading-relaxed">{insights.treatment}</p>
                      </div>
                    )}

                    {/* Analyzed at */}
                    {insights.analyzedAt && (
                      <p className="text-[10px] text-slate-400 text-right">
                        Analyzed {new Date(insights.analyzedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>

                  <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-purple-200 text-purple-600 hover:bg-purple-50 text-xs transition disabled:opacity-60">
                    {mutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                    Re-analyze
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
