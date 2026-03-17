import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Clock, Loader2, ChevronDown, CheckCircle, MessageSquare, Brain, Lightbulb, Play, AlertOctagon, Calendar, User } from "lucide-react";
import { fetchActiveTimeline } from "../../api/consultationApi";
import { useState } from "react";

const EVENT_META = {
  created:             { icon: User,          color: "bg-slate-100 text-slate-600",   label: "Created" },
  accepted:            { icon: CheckCircle,   color: "bg-sky-100 text-sky-600",       label: "Accepted" },
  scheduled:           { icon: Calendar,      color: "bg-blue-100 text-blue-600",     label: "Scheduled" },
  started:             { icon: Play,          color: "bg-emerald-100 text-emerald-600", label: "Started" },
  message_sent:        { icon: MessageSquare, color: "bg-slate-100 text-slate-500",   label: "Message" },
  ai_analysis:         { icon: Brain,         color: "bg-purple-100 text-purple-600", label: "AI Analysis" },
  recommendation_added:{ icon: Lightbulb,     color: "bg-amber-100 text-amber-600",   label: "Recommendation" },
  status_changed:      { icon: Clock,         color: "bg-slate-100 text-slate-500",   label: "Status" },
  escalated:           { icon: AlertOctagon,  color: "bg-red-100 text-red-600",       label: "Escalated" },
  completed:           { icon: CheckCircle,   color: "bg-emerald-100 text-emerald-700", label: "Completed" },
  rejected:            { icon: AlertOctagon,  color: "bg-red-100 text-red-600",       label: "Rejected" }
};

export default function TimelinePanel({ consultationId }) {
  const [open, setOpen] = useState(false);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["active-timeline", consultationId],
    queryFn: () => fetchActiveTimeline(consultationId),
    enabled: !!consultationId && open,
    staleTime: 30_000
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-slate-500" />
          <span className="text-xs font-semibold text-slate-900">Timeline</span>
        </div>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            className="overflow-hidden border-t border-slate-50">
            <div className="px-4 py-3">
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 size={18} className="animate-spin text-slate-400" />
                </div>
              ) : events.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No events yet</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-3.5 top-0 bottom-0 w-px bg-slate-100" />
                  <div className="space-y-3">
                    {events.map((ev, i) => {
                      const meta = EVENT_META[ev.eventType] || EVENT_META.status_changed;
                      const Icon = meta.icon;
                      return (
                        <motion.div key={ev._id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="flex items-start gap-3 relative">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 ${meta.color}`}>
                            <Icon size={12} />
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <p className="text-xs text-slate-700 leading-relaxed">{ev.description}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {ev.actor?.name && (
                                <span className="text-[10px] text-slate-400">{ev.actor.name}</span>
                              )}
                              <span className="text-[10px] text-slate-300">
                                {new Date(ev.createdAt).toLocaleString("en-IN", {
                                  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                                })}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
