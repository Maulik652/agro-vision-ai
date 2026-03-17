import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, Tag, Users, Bell, Edit2, Calendar } from "lucide-react";

const TYPE_COLOR = {
  consultation: "bg-violet-100 text-violet-700 border-violet-200",
  task:         "bg-amber-100 text-amber-700 border-amber-200",
  reminder:     "bg-sky-100 text-sky-700 border-sky-200",
  meeting:      "bg-emerald-100 text-emerald-700 border-emerald-200",
  booking:      "bg-rose-100 text-rose-700 border-rose-200",
};

const STATUS_COLOR = {
  scheduled: "bg-blue-100 text-blue-700",
  ongoing:   "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-600",
};

const PRIORITY_COLOR = {
  low: "text-slate-500", medium: "text-amber-600", high: "text-orange-600", critical: "text-red-600"
};

export default function EventDetailsPanel({ event, onClose, onEdit }) {
  if (!event) return null;

  const start = new Date(event.startTime);
  const end   = new Date(event.endTime);
  const duration = Math.round((end - start) / 60000);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
        className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${TYPE_COLOR[event.type] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                {event.type}
              </span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLOR[event.status] || "bg-slate-100 text-slate-600"}`}>
                {event.status}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-slate-900 leading-snug">{event.title}</h3>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => onEdit(event)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition">
              <Edit2 size={13} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition">
              <X size={13} />
            </button>
          </div>
        </div>

        <div className="space-y-2.5 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Clock size={13} className="text-slate-400 shrink-0" />
            <span>
              {start.toLocaleString("en-IN", { weekday:"short", day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}
              {" → "}
              {end.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })}
              <span className="text-slate-400 ml-1">({duration} min)</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Tag size={13} className="text-slate-400 shrink-0" />
            <span className={`font-medium capitalize ${PRIORITY_COLOR[event.priority]}`}>{event.priority} priority</span>
          </div>

          {event.reminder > 0 && (
            <div className="flex items-center gap-2">
              <Bell size={13} className="text-slate-400 shrink-0" />
              <span>Reminder {event.reminder < 60 ? `${event.reminder} min` : event.reminder === 60 ? "1 hour" : "1 day"} before</span>
            </div>
          )}

          {event.participants?.length > 0 && (
            <div className="flex items-start gap-2">
              <Users size={13} className="text-slate-400 shrink-0 mt-0.5" />
              <div className="flex flex-wrap gap-1">
                {event.participants.map(p => (
                  <span key={p._id || p} className="px-2 py-0.5 bg-slate-100 rounded-full text-[10px] text-slate-600">
                    {p.name || p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {event.description && (
            <div className="flex items-start gap-2">
              <Calendar size={13} className="text-slate-400 shrink-0 mt-0.5" />
              <p className="text-slate-600 leading-relaxed">{event.description}</p>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400">
          Created {new Date(event.createdAt).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}
          {event.createdBy?.name && ` by ${event.createdBy.name}`}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
