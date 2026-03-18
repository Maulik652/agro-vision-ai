import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Send, Save, Eye, X, Loader2, Sparkles } from "lucide-react";
import { createAdvisory, updateAdvisory, publishAdvisory } from "../../api/advisoryApi";
import toast from "react-hot-toast";

const CATEGORIES = ["crop", "market", "disease", "weather", "pest", "irrigation", "general"];
const PRIORITIES = ["low", "medium", "high", "urgent"];
const AUDIENCES  = ["farmers", "buyers"];
const CROPS      = ["Wheat", "Rice", "Tomato", "Cotton", "Maize", "Soybean", "Groundnut", "Sugarcane", "Onion", "Potato"];
const REGIONS    = ["Punjab", "Haryana", "Maharashtra", "Gujarat", "Uttar Pradesh", "Madhya Pradesh", "West Bengal", "Karnataka", "Rajasthan", "Tamil Nadu"];

const EMPTY = {
  title: "", content: "", summary: "", category: "general", priority: "medium",
  targetAudience: ["farmers"], cropTypes: [], regions: [],
  scheduledAt: "", expiresAt: "",
};

const PRIORITY_COLOR = {
  urgent: "bg-red-100 text-red-700 border-red-300",
  high:   "bg-orange-100 text-orange-700 border-orange-300",
  medium: "bg-amber-100 text-amber-700 border-amber-300",
  low:    "bg-slate-100 text-slate-600 border-slate-300",
};

export default function CreateAdvisoryForm({ editData = null, onClose, onAIFill }) {
  const qc = useQueryClient();
  const [form,    setForm]    = useState(editData ? { ...EMPTY, ...editData } : EMPTY);
  const [preview, setPreview] = useState(false);
  const isEdit = !!editData;

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const toggleArr = (k, v) => setForm(f => ({
    ...f,
    [k]: f[k].includes(v) ? f[k].filter(x => x !== v) : [...f[k], v],
  }));

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["advisory-feed"] });
    qc.invalidateQueries({ queryKey: ["advisory-overview"] });
  };

  const saveMut = useMutation({
    mutationFn: () => isEdit ? updateAdvisory(editData._id, form) : createAdvisory(form),
    onSuccess: () => { toast.success(isEdit ? "Updated" : "Draft saved"); invalidate(); onClose?.(); },
    onError: e => toast.error(e?.response?.data?.message || "Save failed"),
  });

  const publishMut = useMutation({
    mutationFn: async () => {
      const doc = isEdit ? await updateAdvisory(editData._id, form) : await createAdvisory(form);
      return publishAdvisory(doc._id);
    },
    onSuccess: () => { toast.success("Published"); invalidate(); onClose?.(); },
    onError: e => toast.error(e?.response?.data?.message || "Publish failed"),
  });

  const handleAIFill = () => onAIFill?.(form, result => {
    setForm(f => ({
      ...f,
      title:   result.title   || f.title,
      content: result.content || f.content,
      summary: result.summary || f.summary,
    }));
  });

  const canSubmit = form.title.trim() && form.content.trim();

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-emerald-600" />
          <h2 className="text-sm font-semibold text-slate-900">{isEdit ? "Edit Advisory" : "Create Advisory"}</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPreview(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              preview ? "bg-slate-100 text-slate-700" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <Eye size={12} /> {preview ? "Edit" : "Preview"}
          </button>
          <button
            onClick={handleAIFill}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 transition"
          >
            <Sparkles size={12} /> AI Fill
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {preview ? (
          <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 capitalize font-medium">{form.category}</span>
              <span className={`text-xs px-2.5 py-1 rounded-full capitalize font-medium border ${PRIORITY_COLOR[form.priority]}`}>{form.priority}</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">{form.title || "Untitled Advisory"}</h1>
            {form.summary && <p className="text-sm text-slate-500 italic border-l-2 border-slate-200 pl-3">{form.summary}</p>}
            <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-100">
              {form.content || "No content yet."}
            </div>
            {(form.targetAudience.length > 0 || form.regions.length > 0 || form.cropTypes.length > 0) && (
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 mb-2">Targeting</p>
                <div className="flex flex-wrap gap-1.5">
                  {form.targetAudience.map(a => <span key={a} className="text-xs px-2 py-0.5 rounded bg-sky-50 text-sky-700 capitalize">{a}</span>)}
                  {form.regions.map(r => <span key={r} className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">{r}</span>)}
                  {form.cropTypes.map(c => <span key={c} className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">{c}</span>)}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">

            {/* Title */}
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1.5">Title *</label>
              <input
                value={form.title}
                onChange={set("title")}
                placeholder="e.g. Wheat Rust Alert — Punjab Region"
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:bg-white transition"
              />
            </div>

            {/* Summary */}
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1.5">Summary</label>
              <input
                value={form.summary}
                onChange={set("summary")}
                placeholder="One-line summary shown in the feed..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:bg-white transition"
              />
            </div>

            {/* Category + Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">Category</label>
                <select value={form.category} onChange={set("category")}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-400 transition capitalize">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">Priority</label>
                <select value={form.priority} onChange={set("priority")}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-400 transition capitalize">
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {/* Content */}
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1.5">Content *</label>
              <textarea
                value={form.content}
                onChange={set("content")}
                rows={7}
                placeholder="Write your advisory content here. Be specific, actionable, and clear..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:bg-white transition resize-none leading-relaxed"
              />
            </div>

            {/* Audience */}
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-2">Target Audience</label>
              <div className="flex gap-2">
                {AUDIENCES.map(a => (
                  <button key={a} type="button" onClick={() => toggleArr("targetAudience", a)}
                    className={`px-3 py-1.5 rounded-lg text-xs capitalize transition border font-medium ${
                      form.targetAudience.includes(a)
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:border-emerald-300"
                    }`}>{a}</button>
                ))}
              </div>
            </div>

            {/* Crops */}
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-2">Crop Types</label>
              <div className="flex flex-wrap gap-1.5">
                {CROPS.map(c => (
                  <button key={c} type="button" onClick={() => toggleArr("cropTypes", c)}
                    className={`px-2.5 py-1 rounded-lg text-xs transition border ${
                      form.cropTypes.includes(c)
                        ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                        : "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300"
                    }`}>{c}</button>
                ))}
              </div>
            </div>

            {/* Regions */}
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-2">Regions</label>
              <div className="flex flex-wrap gap-1.5">
                {REGIONS.map(r => (
                  <button key={r} type="button" onClick={() => toggleArr("regions", r)}
                    className={`px-2.5 py-1 rounded-lg text-xs transition border ${
                      form.regions.includes(r)
                        ? "bg-sky-100 text-sky-700 border-sky-300"
                        : "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300"
                    }`}>{r}</button>
                ))}
              </div>
            </div>

            {/* Schedule */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">Schedule Publish</label>
                <input type="datetime-local" value={form.scheduledAt} onChange={set("scheduledAt")}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-emerald-400 transition" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">Expires At</label>
                <input type="datetime-local" value={form.expiresAt} onChange={set("expiresAt")}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-emerald-400 transition" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-100 bg-slate-50">
        {onClose && (
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-100 transition">
            Cancel
          </button>
        )}
        <button
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending || !canSubmit}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm hover:bg-slate-100 transition disabled:opacity-50"
        >
          {saveMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          Save Draft
        </button>
        <button
          onClick={() => publishMut.mutate()}
          disabled={publishMut.isPending || !canSubmit}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition disabled:opacity-50 shadow-sm"
        >
          {publishMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          Publish Now
        </button>
      </div>
    </div>
  );
}
