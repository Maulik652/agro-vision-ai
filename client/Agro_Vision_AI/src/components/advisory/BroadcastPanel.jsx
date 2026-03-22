import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { Radio, Send, Loader2, AlertTriangle, Bell, X, Zap, Info, TrendingUp } from "lucide-react";
import { broadcastAlert } from "../../api/advisoryApi";
import useAdvisorySocket from "../../hooks/useAdvisorySocket";
import toast from "react-hot-toast";

const PRIORITY_STYLE = {
  low:    "border-slate-200 bg-slate-50 text-slate-600",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  high:   "border-orange-200 bg-orange-50 text-orange-700",
  urgent: "border-red-200 bg-red-50 text-red-700",
};

const PRIORITY_ICON = {
  urgent: Zap,
  high:   AlertTriangle,
  medium: TrendingUp,
  low:    Info,
};

export default function BroadcastPanel() {
  const [form,   setForm]   = useState({ title: "", message: "", category: "general", priority: "high" });
  const [alerts, setAlerts] = useState([]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Use shared singleton socket — no new io() connection
  useAdvisorySocket({
    onBroadcast: (data) => {
      if (!data?.title) return;
      setAlerts((prev) => [{ ...data, id: Date.now() }, ...prev].slice(0, 10));
    },
  });

  const mutation = useMutation({
    mutationFn: () => broadcastAlert(form),
    onSuccess: () => {
      toast.success("Alert broadcast sent");
      setForm({ title: "", message: "", category: "general", priority: "high" });
    },
    onError: () => toast.error("Broadcast failed"),
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3.5 border-b border-slate-100">
        <Radio size={14} className="text-red-600" />
        <h2 className="text-sm font-semibold text-slate-900">Broadcast Alert</h2>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Title */}
        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1.5">Alert Title</label>
          <input
            value={form.title}
            onChange={set("title")}
            placeholder="e.g. Disease Outbreak Alert — Punjab"
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-red-400 focus:bg-white transition"
          />
        </div>

        {/* Message */}
        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1.5">Message</label>
          <textarea
            value={form.message}
            onChange={set("message")}
            rows={3}
            placeholder="Describe the alert and recommended actions..."
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-red-400 focus:bg-white transition resize-none"
          />
        </div>

        {/* Category + Priority */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">Category</label>
            <select value={form.category} onChange={set("category")}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none capitalize">
              {["crop", "market", "disease", "weather", "pest", "general"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">Priority</label>
            <select value={form.priority} onChange={set("priority")}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none capitalize">
              {["low", "medium", "high", "urgent"].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !form.title || !form.message}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition disabled:opacity-50 shadow-sm"
        >
          {mutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          {mutation.isPending ? "Broadcasting…" : "Broadcast Now"}
        </button>

        {/* Live feed */}
        {alerts.length > 0 && (
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-2.5">
              <Bell size={12} className="text-slate-400" />
              <p className="text-xs font-semibold text-slate-500">Recent Broadcasts</p>
              <button onClick={() => setAlerts([])} className="ml-auto text-[10px] text-slate-400 hover:text-slate-600 transition">
                Clear all
              </button>
            </div>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-0.5">
              <AnimatePresence>
                {alerts.map((a) => {
                  const Icon = PRIORITY_ICON[a.priority] || AlertTriangle;
                  return (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 6 }}
                      className={`p-3 rounded-xl border text-xs ${PRIORITY_STYLE[a.priority] || PRIORITY_STYLE.medium}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Icon size={11} className="shrink-0" />
                          <span className="font-semibold truncate">{a.title}</span>
                        </div>
                        <button
                          onClick={() => setAlerts((prev) => prev.filter((x) => x.id !== a.id))}
                          className="opacity-50 hover:opacity-100 transition shrink-0"
                        >
                          <X size={11} />
                        </button>
                      </div>
                      {a.message && <p className="mt-1 opacity-75 line-clamp-2 leading-relaxed">{a.message}</p>}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
