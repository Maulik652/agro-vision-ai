import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Sparkles, Loader2, CalendarCheck, ChevronDown, ChevronUp } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { smartSchedule } from "../../api/scheduleApi";

const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-green-400 transition";

export default function AIScheduler({ onUseSlot }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ duration: 30, preferredDate: "", priority: "medium" });
  const [result, setResult] = useState(null);

  const mut = useMutation({
    mutationFn: smartSchedule,
    onSuccess: (data) => setResult(data),
  });

  const run = () => {
    setResult(null);
    mut.mutate(form);
  };

  return (
    <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl shadow-sm overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 p-4 text-left">
        <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
          <Brain size={16} className="text-violet-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800">AI Smart Scheduler</p>
          <p className="text-xs text-slate-500">Find the best available time slot</p>
        </div>
        {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-3 border-t border-violet-100 pt-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Duration (min)</label>
                  <select value={form.duration} onChange={e => setForm(p => ({ ...p, duration: Number(e.target.value) }))} className={inputCls}>
                    {[15,30,45,60,90,120].map(d => <option key={d} value={d} className="text-slate-800">{d} min</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Priority</label>
                  <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} className={inputCls}>
                    {["low","medium","high","critical"].map(p => <option key={p} value={p} className="text-slate-800">{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Preferred Date (optional)</label>
                <input type="date" value={form.preferredDate} onChange={e => setForm(p => ({ ...p, preferredDate: e.target.value }))} className={inputCls} />
              </div>

              <button onClick={run} disabled={mut.isPending}
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2">
                {mut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Find Best Slot
              </button>

              {/* Result */}
              <AnimatePresence>
                {result && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-violet-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <CalendarCheck size={14} className="text-violet-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-slate-700 font-medium">{result.label}</p>
                    </div>
                    {result.suggestion && (
                      <>
                        <div className="text-[10px] text-slate-500 space-y-0.5">
                          <p>Start: {new Date(result.suggestion.startTime).toLocaleString("en-IN", { weekday:"short", day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}</p>
                          <p>End:   {new Date(result.suggestion.endTime).toLocaleString("en-IN", { hour:"2-digit", minute:"2-digit" })}</p>
                          <p>Conflicts on that day: {result.conflictCount}</p>
                        </div>
                        <button onClick={() => onUseSlot?.(result.suggestion)}
                          className="w-full py-1.5 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-700 text-xs font-medium transition">
                          Use This Slot
                        </button>
                      </>
                    )}
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
