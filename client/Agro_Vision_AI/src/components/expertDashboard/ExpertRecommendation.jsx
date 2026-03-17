import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, CheckCircle, Loader2 } from "lucide-react";
import { postExpertRecommendation } from "../../api/expertDashboardApi";
import toast from "react-hot-toast";

export default function ExpertRecommendation() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", body: "", cropName: "", region: "", priority: "medium" });
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: postExpertRecommendation,
    onSuccess: () => {
      setSent(true);
      setForm({ title: "", body: "", cropName: "", region: "", priority: "medium" });
      toast.success("Recommendation published");
      qc.invalidateQueries({ queryKey: ["expert-overview"] });
      setTimeout(() => setSent(false), 3000);
    },
    onError: (e) => toast.error(e?.response?.data?.message || "Failed to publish")
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return toast.error("Title and body are required");
    mutation.mutate(form);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6"
    >
      <div className="flex items-center gap-2 mb-5">
        <Lightbulb size={18} className="text-yellow-500" />
        <h2 className="text-slate-800 font-semibold text-base">Expert Recommendation System</h2>
      </div>

      <AnimatePresence>
        {sent && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4"
          >
            <CheckCircle size={16} className="text-emerald-600" />
            <span className="text-sm text-emerald-700">Recommendation published successfully</span>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          value={form.title} onChange={set("title")}
          placeholder="Title (e.g. Wheat demand rising in North India)"
          className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500 transition"
        />
        <textarea
          value={form.body} onChange={set("body")}
          placeholder="Detailed recommendation for farmers..."
          rows={4}
          className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500 transition resize-none"
        />
        <div className="grid grid-cols-3 gap-3">
          <input value={form.cropName} onChange={set("cropName")} placeholder="Crop (optional)"
            className="bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500 transition" />
          <input value={form.region} onChange={set("region")} placeholder="Region (optional)"
            className="bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500 transition" />
          <select value={form.priority} onChange={set("priority")}
            className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500 transition">
            {["low", "medium", "high"].map((p) => (
              <option key={p} value={p} className="capitalize">{p}</option>
            ))}
          </select>
        </div>
        <button
          type="submit" disabled={mutation.isPending}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-medium rounded-xl py-2.5 text-sm transition"
        >
          {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
          {mutation.isPending ? "Publishing..." : "Publish Recommendation"}
        </button>
      </form>
    </motion.div>
  );
}
