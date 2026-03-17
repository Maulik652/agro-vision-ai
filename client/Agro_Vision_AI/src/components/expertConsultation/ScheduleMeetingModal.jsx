import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Loader2, Video, Phone, MessageSquare, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { scheduleConsultation } from "../../api/consultationApi";
import toast from "react-hot-toast";

const MEETING_TYPES = [
  { value: "video", label: "Video Call", icon: Video },
  { value: "phone", label: "Phone Call", icon: Phone },
  { value: "chat",  label: "Chat",       icon: MessageSquare }
];

export default function ScheduleMeetingModal({ consultation, open, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ date: "", time: "", meetingType: "video", meetingLink: "", notes: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const mutation = useMutation({
    mutationFn: () => scheduleConsultation(consultation._id, form),
    onSuccess: () => {
      toast.success("Consultation scheduled");
      qc.invalidateQueries({ queryKey: ["consultations"] });
      qc.invalidateQueries({ queryKey: ["consultation", consultation._id] });
      onClose();
    },
    onError: (e) => toast.error(e?.response?.data?.message || "Scheduling failed")
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.date || !form.time) return toast.error("Date and time are required");
    mutation.mutate();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-lg shadow-xl">

            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-emerald-600" />
                <h3 className="text-slate-900 font-semibold">Schedule Consultation</h3>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition"><X size={18} /></button>
            </div>

            <div className="mb-4 p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <p className="text-xs text-slate-400">Consultation for</p>
              <p className="text-sm text-slate-900 font-medium">{consultation?.user?.name} · {consultation?.cropType}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Meeting type */}
              <div>
                <p className="text-xs text-slate-500 mb-2">Meeting Type</p>
                <div className="grid grid-cols-3 gap-2">
                  {MEETING_TYPES.map(({ value, label, icon: Icon }) => (
                    <button key={value} type="button" onClick={() => setForm((f) => ({ ...f, meetingType: value }))}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs transition ${
                        form.meetingType === value
                          ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                      }`}>
                      <Icon size={16} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1.5">Date</label>
                  <input type="date" value={form.date} onChange={set("date")} min={new Date().toISOString().split("T")[0]}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-400 transition" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1.5">Time</label>
                  <input type="time" value={form.time} onChange={set("time")}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-400 transition" />
                </div>
              </div>

              {form.meetingType === "video" && (
                <div>
                  <label className="text-xs text-slate-500 block mb-1.5">Meeting Link (optional)</label>
                  <input type="url" value={form.meetingLink} onChange={set("meetingLink")} placeholder="https://meet.google.com/..."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-400 transition" />
                </div>
              )}

              <div>
                <label className="text-xs text-slate-500 block mb-1.5">Notes (optional)</label>
                <textarea value={form.notes} onChange={set("notes")} rows={2} placeholder="Any preparation notes for the farmer..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-400 transition resize-none" />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition">Cancel</button>
                <button type="submit" disabled={mutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition disabled:opacity-60 flex items-center justify-center gap-2">
                  {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  {mutation.isPending ? "Scheduling..." : "Confirm Schedule"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
