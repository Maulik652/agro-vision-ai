import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { Sparkles, Loader2, Copy, Check, ChevronDown, RefreshCw } from "lucide-react";
import { generateAdvisoryAI } from "../../api/advisoryApi";
import toast from "react-hot-toast";

const CROPS    = ["Wheat", "Rice", "Tomato", "Cotton", "Maize", "Soybean", "Onion", "Potato"];
const REGIONS  = ["Punjab", "Maharashtra", "Gujarat", "Uttar Pradesh", "West Bengal", "Karnataka"];
const CATS     = ["crop", "market", "disease", "weather", "pest", "irrigation"];
const TONES    = ["informative", "urgent", "advisory", "warning"];

export default function AIAssistantPanel({ onApply }) {
  const [open, setOpen]   = useState(true);
  const [form, setForm]   = useState({ cropType: "Wheat", region: "Punjab", category: "crop", tone: "informative", keywords: "" });
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(null);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const mutation = useMutation({
    mutationFn: () => generateAdvisoryAI(form),
    onSuccess: (data) => setResult(data),
    onError: () => toast.error("AI generation failed")
  });

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-violet-600" />
          <span className="text-sm font-semibold text-slate-900">AI Advisory Assistant</span>
          <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">Smart</span>
        </div>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            className="overflow-hidden border-t border-slate-100">
            <div className="p-5 space-y-4">
              {/* Config */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "cropType", label: "Crop", options: CROPS },
                  { key: "region",   label: "Region", options: REGIONS },
                  { key: "category", label: "Category", options: CATS },
                  { key: "tone",     label: "Tone", options: TONES }
                ].map(({ key, label, options }) => (
                  <div key={key}>
                    <label className="text-[10px] text-slate-400 block mb-1 capitalize">{label}</label>
                    <select value={form[key]} onChange={set(key)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-violet-400 transition capitalize">
                      {options.map(o => <option key={o} value={o} className="capitalize">{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Keywords (optional)</label>
                <input value={form.keywords} onChange={set("keywords")} placeholder="e.g. rust, fungicide, early warning..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 placeholder-slate-400 rounded-lg px-3 py-2 text-xs outline-none focus:border-violet-400 transition" />
              </div>

              <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition disabled:opacity-60">
                {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {mutation.isPending ? "Generating..." : "Generate Advisory"}
              </button>

              {/* Result */}
              <AnimatePresence>
                {result && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="space-y-3 pt-2 border-t border-slate-100">
                    {/* Title */}
                    <div className="group relative p-3 bg-violet-50 border border-violet-100 rounded-xl">
                      <p className="text-[10px] text-violet-500 mb-1 font-medium">Generated Title</p>
                      <p className="text-sm font-semibold text-slate-900 pr-6">{result.title}</p>
                      <button onClick={() => handleCopy(result.title, "title")}
                        className="absolute top-2 right-2 p-1 rounded text-violet-400 hover:text-violet-600">
                        {copied === "title" ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>

                    {/* Content */}
                    <div className="group relative p-3 bg-slate-50 border border-slate-100 rounded-xl">
                      <p className="text-[10px] text-slate-400 mb-1 font-medium">Generated Content</p>
                      <p className="text-xs text-slate-700 leading-relaxed line-clamp-4">{result.content}</p>
                      <button onClick={() => handleCopy(result.content, "content")}
                        className="absolute top-2 right-2 p-1 rounded text-slate-400 hover:text-slate-600">
                        {copied === "content" ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>

                    {/* Suggested titles */}
                    {result.suggestedTitles?.length > 0 && (
                      <div>
                        <p className="text-[10px] text-slate-400 mb-2 font-medium">Alternative Titles</p>
                        <div className="space-y-1.5">
                          {result.suggestedTitles.map((t, i) => (
                            <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 hover:border-violet-200 transition cursor-pointer"
                              onClick={() => onApply?.({ title: t })}>
                              <p className="text-xs text-slate-700 flex-1">{t}</p>
                              <Copy size={11} className="text-slate-300 shrink-0" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs hover:bg-slate-50 transition">
                        <RefreshCw size={12} /> Regenerate
                      </button>
                      <button onClick={() => onApply?.(result)}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition">
                        Use in Form
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
