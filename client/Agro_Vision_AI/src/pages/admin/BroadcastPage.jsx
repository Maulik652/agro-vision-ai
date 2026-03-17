import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { broadcastNotification } from "../../api/adminApi";
import toast from "react-hot-toast";
import { Megaphone, Send, Users, CheckCircle2 } from "lucide-react";

const ROLES = [
  { value: "all", label: "All Users" },
  { value: "farmer", label: "Farmers Only" },
  { value: "buyer", label: "Buyers Only" },
  { value: "expert", label: "Experts Only" },
];

export default function BroadcastPage() {
  const [form, setForm] = useState({ title: "", message: "", targetRole: "all" });
  const [lastResult, setLastResult] = useState(null);

  const { mutate, isPending } = useMutation({
    mutationFn: broadcastNotification,
    onSuccess: (data) => {
      setLastResult(data);
      toast.success(`Broadcast sent to ${data?.sentCount || 0} users`);
      setForm({ title: "", message: "", targetRole: "all" });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Broadcast failed");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      toast.error("Title and message are required");
      return;
    }
    mutate(form);
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
          Broadcast Notifications
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Send platform-wide notifications to all or specific user roles</p>
      </div>

      {/* Last Result Banner */}
      {lastResult && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-2xl bg-green-50 border border-green-200">
          <CheckCircle2 size={18} className="text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Broadcast Delivered</p>
            <p className="text-xs text-green-600 mt-0.5">
              Sent to <span className="font-bold">{lastResult.sentCount}</span> users
              {lastResult.targetRole !== "all" && ` (${lastResult.targetRole}s)`}
            </p>
          </div>
        </motion.div>
      )}

      {/* Form */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center">
            <Megaphone size={15} className="text-green-600" />
          </div>
          <h2 className="font-bold text-slate-800 text-sm" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
            Compose Broadcast
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Role */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
              Target Audience
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, targetRole: r.value }))}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                    form.targetRole === r.value
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:border-green-300 hover:text-green-700"
                  }`}
                >
                  <Users size={12} />
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Notification Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Platform Maintenance Scheduled"
              maxLength={100}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition"
            />
            <p className="text-[10px] text-slate-400 mt-1 text-right">{form.title.length}/100</p>
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Message
            </label>
            <textarea
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              placeholder="Write your broadcast message here..."
              rows={5}
              maxLength={500}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition resize-none"
            />
            <p className="text-[10px] text-slate-400 mt-1 text-right">{form.message.length}/500</p>
          </div>

          {/* Preview */}
          {(form.title || form.message) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Preview</p>
              <p className="text-sm font-bold text-slate-800">{form.title || "—"}</p>
              <p className="text-xs text-slate-500 mt-1">{form.message || "—"}</p>
              <p className="text-[10px] text-slate-400 mt-2">
                → {ROLES.find((r) => r.value === form.targetRole)?.label}
              </p>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={15} />
            )}
            {isPending ? "Sending..." : "Send Broadcast"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
