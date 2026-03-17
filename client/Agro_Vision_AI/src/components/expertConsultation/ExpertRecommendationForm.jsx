import { useState } from "react";
import { motion } from "framer-motion";
import { Lightbulb, Loader2, CheckCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postConsultationRecommendation } from "../../api/consultationApi";
import toast from "react-hot-toast";

export default function ExpertRecommendationForm({ consultationId }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    treatmentAdvice: "", fertilizerSuggestion: "", marketGuidance: "",
    followUpRequired: false, followUpDate: ""
  });
  const [saved, setSaved] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const mutation = useMutation({
    mutationFn: () => postConsultationRecommendation(consultationId, form),
    onSuccess: () => {
      setSaved(true);
      toast.success("Recommendation saved");
      qc.invalidateQueries({ queryKey: ["consultation", consultationId] });
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (e) => toast.error(e?.response?.data?.message || "Failed to save")
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb size={16} className="text-yellow-500" />
        <h3 className="text-slate-900 font-semibold text-sm">Expert Recommendation</h3>
      </div>

      {saved && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 mb-3">
          <CheckCircle size={14} className="text-emerald-600" />
          <span className="text-xs text-emerald-700">Recommendation saved</span>
        </motion.div>
      )}

      <div className="space-y-3">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Treatment Advice</label>
          <textarea value={form.treatmentAdvice} onChange={set("treatmentAdvice")} rows={3}
            placeholder="Describe treatment steps, pesticides, organic solutions..."
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-yellow-400 transition resize-none" />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Fertilizer Suggestion</label>
          <textarea value={form.fertilizerSuggestion} onChange={set("fertilizerSuggestion")} rows={2}
            placeholder="NPK ratios, organic fertilizers, application schedule..."
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-yellow-400 transition resize-none" />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Market Guidance</label>
          <textarea value={form.marketGuidance} onChange={set("marketGuidance")} rows={2}
            placeholder="Best time to sell, price expectations, storage advice..."
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-yellow-400 transition resize-none" />
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.followUpRequired}
              onChange={(e) => setForm((f) => ({ ...f, followUpRequired: e.target.checked }))}
              className="w-4 h-4 accent-yellow-500" />
            <span className="text-xs text-slate-600">Follow-up required</span>
          </label>
          {form.followUpRequired && (
            <input type="date" value={form.followUpDate} onChange={set("followUpDate")}
              className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-yellow-400 transition" />
          )}
        </div>
        <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
          className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition flex items-center justify-center gap-2">
          {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
          {mutation.isPending ? "Saving..." : "Save Recommendation"}
        </button>
      </div>
    </motion.div>
  );
}
