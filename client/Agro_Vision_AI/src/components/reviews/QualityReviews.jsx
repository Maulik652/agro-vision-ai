import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Leaf, Plus, X, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { createQualityReview } from "../../api/reviewsApi.js";
import StarRating from "./StarRating.jsx";

const GRADES   = ["A+","A","B+","B","C","D"];
const DISEASES = ["none","low","medium","high"];
const GRADE_COLORS = { "A+": "bg-emerald-100 text-emerald-700", A: "bg-green-100 text-green-700", "B+": "bg-lime-100 text-lime-700", B: "bg-yellow-100 text-yellow-700", C: "bg-orange-100 text-orange-700", D: "bg-red-100 text-red-700" };

const AddQualityModal = ({ open, onClose }) => {
  const [form, setForm] = useState({ cropId: "", farmerId: "", cropName: "", qualityRating: 0, grading: "B", diseaseRisk: "none", feedback: "" });
  const qc = useQueryClient();
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = useMutation({
    mutationFn: () => createQualityReview(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quality-reviews"] }); onClose(); },
  });

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-800">Add Quality Review</h3>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <input value={form.cropName} onChange={e => set("cropName", e.target.value)} placeholder="Crop name"
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              <div>
                <label className="text-[11px] text-slate-500 uppercase tracking-wide block mb-1">Quality Rating</label>
                <StarRating rating={form.qualityRating} size={24} interactive onChange={v => set("qualityRating", v)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-500 uppercase tracking-wide block mb-1">Grade</label>
                  <select value={form.grading} onChange={e => set("grading", e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400">
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 uppercase tracking-wide block mb-1">Disease Risk</label>
                  <select value={form.diseaseRisk} onChange={e => set("diseaseRisk", e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400">
                    {DISEASES.map(d => <option key={d} value={d} className="capitalize">{d}</option>)}
                  </select>
                </div>
              </div>
              <textarea value={form.feedback} onChange={e => set("feedback", e.target.value)} rows={3} placeholder="Expert feedback on crop quality..."
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
            </div>
            {submit.isError && <p className="text-xs text-red-600 mt-2">{submit.error?.response?.data?.message || "Failed"}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={() => submit.mutate()} disabled={!form.qualityRating || submit.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                {submit.isPending ? <Loader2 size={14} className="animate-spin" /> : null} Submit
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const QualityReviews = ({ data, loading, filters, onFilterChange }) => {
  const [showAdd, setShowAdd] = useState(false);
  const reviews = data?.reviews || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;
  const page  = data?.page  || 1;

  return (
    <>
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <Leaf size={15} className="text-emerald-600" />
          <h3 className="text-sm font-semibold text-slate-800">Crop Quality Reviews</h3>
          <span className="text-xs text-slate-400 ml-auto">{total} reviews</span>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors">
            <Plus size={12} /> Add Review
          </button>
        </div>
        <div className="divide-y divide-slate-50">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <div key={i} className="p-4"><div className="h-14 bg-slate-50 rounded-xl animate-pulse" /></div>)
          ) : reviews.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-10">No quality reviews yet</p>
          ) : reviews.map(r => (
            <div key={r._id} className="p-4 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-semibold text-slate-800">{r.cropName || "Crop"}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${GRADE_COLORS[r.grading] || "bg-slate-100 text-slate-600"}`}>{r.grading}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${r.diseaseRisk === "none" ? "bg-emerald-50 text-emerald-600" : r.diseaseRisk === "high" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>
                    {r.diseaseRisk} risk
                  </span>
                </div>
                <StarRating rating={r.qualityRating} size={12} />
                {r.feedback && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{r.feedback}</p>}
                <p className="text-[10px] text-slate-400 mt-1">by {r.expert?.name} · {new Date(r.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
        {pages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">Page {page} of {pages}</span>
            <div className="flex gap-1">
              <button onClick={() => onFilterChange({ page: page - 1 })} disabled={page <= 1} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors"><ChevronLeft size={13} /></button>
              <button onClick={() => onFilterChange({ page: page + 1 })} disabled={page >= pages} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors"><ChevronRight size={13} /></button>
            </div>
          </div>
        )}
      </div>
      <AddQualityModal open={showAdd} onClose={() => setShowAdd(false)} />
    </>
  );
};

export default QualityReviews;
