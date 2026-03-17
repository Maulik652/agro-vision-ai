import { motion } from "framer-motion";
import { Calendar, Clock } from "lucide-react";

const TIME_SLOTS = [
  "09:00 AM","10:00 AM","11:00 AM","12:00 PM",
  "02:00 PM","03:00 PM","04:00 PM","05:00 PM","06:00 PM",
];

const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-all";

const today = new Date().toISOString().split("T")[0];

export default function SchedulePicker({ schedule, onChange }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-4"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-cyan-100 flex items-center justify-center">
          <Calendar size={18} className="text-cyan-600" />
        </div>
        <div>
          <h2 className="text-slate-900 font-semibold text-lg">Schedule Session</h2>
          <p className="text-slate-500 text-xs">Pick a date and time slot</p>
        </div>
      </div>

      <div>
        <label className="text-slate-600 text-sm mb-1.5 block">Preferred Date *</label>
        <input
          type="date"
          min={today}
          value={schedule.date}
          onChange={e => onChange("date", e.target.value)}
          className={inputCls}
        />
      </div>

      <div>
        <label className="text-slate-600 text-sm mb-2 block flex items-center gap-2">
          <Clock size={13} className="text-slate-500" /> Time Slot *
        </label>
        <div className="grid grid-cols-3 gap-2">
          {TIME_SLOTS.map(slot => (
            <button
              key={slot}
              onClick={() => onChange("time", slot)}
              className={`py-2 px-3 rounded-xl text-xs font-medium transition-all border ${
                schedule.time === slot
                  ? "bg-green-100 border-green-300 text-green-700"
                  : "bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-200 hover:text-slate-600"
              }`}
            >
              {slot}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-slate-600 text-sm mb-1.5 block">Additional Notes</label>
        <textarea
          rows={2}
          value={schedule.notes}
          onChange={e => onChange("notes", e.target.value)}
          placeholder="Any specific requirements for the session..."
          className={`${inputCls} resize-none`}
        />
      </div>
    </motion.div>
  );
}
