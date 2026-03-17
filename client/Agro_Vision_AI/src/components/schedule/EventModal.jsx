import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Calendar, Clock, Tag, AlertCircle } from "lucide-react";

const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition";
const labelCls = "text-xs text-slate-500 block mb-1 font-medium";

const TYPES     = ["consultation","task","reminder","meeting","booking"];
const PRIORITIES = ["low","medium","high","critical"];

const PRIORITY_COLOR = {
  low: "text-slate-500", medium: "text-amber-600", high: "text-orange-600", critical: "text-red-600"
};

export default function EventModal({ open, onClose, onSave, onDelete, initial = null, loading = false }) {
  const isEdit = !!initial?._id;

  const [form, setForm] = useState({
    title: "", description: "", type: "task", startTime: "", endTime: "",
    priority: "medium", reminder: 15,
  });

  useEffect(() => {
    if (initial) {
      setForm({
        title:       initial.title       || "",
        description: initial.description || "",
        type:        initial.type        || "task",
        startTime:   initial.startTime   ? initial.startTime.slice(0,16) : "",
        endTime:     initial.endTime     ? initial.endTime.slice(0,16)   : "",
        priority:    initial.priority    || "medium",
        reminder:    initial.reminder    ?? 15,
      });
    } else {
      setForm({ title:"", description:"", type:"task", startTime:"", endTime:"", priority:"medium", reminder:15 });
    }
  }, [initial, open]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.startTime || !form.endTime) return;
    onSave(form);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Calendar size={16} className="text-green-600" />
                {isEdit ? "Edit Event" : "New Event"}
              </h3>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={labelCls}>Title *</label>
                <input value={form.title} onChange={e => set("title", e.target.value)}
                  placeholder="Event title" className={inputCls} required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Type</label>
                  <select value={form.type} onChange={e => set("type", e.target.value)} className={inputCls}>
                    {TYPES.map(t => <option key={t} value={t} className="text-slate-800">{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Priority</label>
                  <select value={form.priority} onChange={e => set("priority", e.target.value)} className={inputCls}>
                    {PRIORITIES.map(p => <option key={p} value={p} className="text-slate-800">{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}><Clock size={11} className="inline mr-1" />Start *</label>
                  <input type="datetime-local" value={form.startTime} onChange={e => set("startTime", e.target.value)} className={inputCls} required />
                </div>
                <div>
                  <label className={labelCls}><Clock size={11} className="inline mr-1" />End *</label>
                  <input type="datetime-local" value={form.endTime} onChange={e => set("endTime", e.target.value)} className={inputCls} required />
                </div>
              </div>

              <div>
                <label className={labelCls}><AlertCircle size={11} className="inline mr-1" />Reminder (minutes before)</label>
                <select value={form.reminder} onChange={e => set("reminder", Number(e.target.value))} className={inputCls}>
                  {[5,10,15,30,60,1440].map(m => (
                    <option key={m} value={m} className="text-slate-800">
                      {m < 60 ? `${m} min` : m === 60 ? "1 hour" : "1 day"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}><Tag size={11} className="inline mr-1" />Description</label>
                <textarea rows={2} value={form.description} onChange={e => set("description", e.target.value)}
                  placeholder="Optional details..." className={`${inputCls} resize-none`} />
              </div>

              <div className="flex gap-3 pt-1">
                {isEdit && (
                  <button type="button" onClick={() => onDelete(initial._id)}
                    className="px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm hover:bg-red-100 transition">
                    Delete
                  </button>
                )}
                <button type="button" onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-sm text-slate-600 hover:bg-slate-200 transition">
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                  {isEdit ? "Save" : "Create"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
