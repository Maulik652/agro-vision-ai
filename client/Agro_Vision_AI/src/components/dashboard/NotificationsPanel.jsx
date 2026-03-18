import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck, Radio, Tag, XCircle } from "lucide-react";

const PRIORITY_CONFIG = {
  high:     { border: "border-l-red-400",     bg: "bg-red-50/60",    badge: "bg-red-100 text-red-700" },
  critical: { border: "border-l-red-500",     bg: "bg-red-50/60",    badge: "bg-red-100 text-red-700" },
  normal:   { border: "border-l-green-500",   bg: "bg-white",        badge: "bg-green-50 text-green-700" },
  low:      { border: "border-l-slate-300",   bg: "bg-slate-50/60",  badge: "bg-slate-100 text-slate-500" }
};

const TYPE_ICON = {
  offer_accepted: { icon: Tag,     color: "text-emerald-600" },
  offer_rejected: { icon: XCircle, color: "text-red-500"     },
  order_cancelled:{ icon: XCircle, color: "text-red-500"     },
};

const fmtTime = (d) => {
  try {
    return new Date(d).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short", hour12: true });
  } catch { return "—"; }
};

const NotificationsPanel = ({ notifications, isLoading, realtimeNotifications, isSocketConnected }) => {
  const merged = [
    ...Array.isArray(realtimeNotifications) ? realtimeNotifications : [],
    ...Array.isArray(notifications) ? notifications : []
  ].filter((row, i, all) => all.findIndex((o) => String(o.id) === String(row.id)) === i);

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-xl bg-amber-50 p-2.5">
            <Bell size={18} className="text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Notifications</h2>
            <p className="text-sm text-slate-500">Price drops, orders & new listings</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5">
          <Radio size={12} className={isSocketConnected ? "text-emerald-500 animate-pulse" : "text-slate-300"} />
          <span className="text-xs font-medium text-slate-600">{isSocketConnected ? "Live" : "Offline"}</span>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : merged.length ? (
          <ul className="space-y-2 max-h-96 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {merged.slice(0, 15).map((row) => {
              const cfg = PRIORITY_CONFIG[row.priority] || PRIORITY_CONFIG.normal;
              const typeInfo = TYPE_ICON[row.type];
              const TypeIcon = typeInfo?.icon;
              return (
                <motion.li
                  key={String(row.id || row._id)}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}
                  className={`rounded-xl border-l-4 p-3.5 text-sm ${cfg.border} ${cfg.bg}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {TypeIcon && <TypeIcon size={14} className={`${typeInfo.color} shrink-0 mt-0.5`} />}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{row.title}</p>
                        <p className="mt-0.5 text-slate-600 text-xs leading-relaxed">{row.message}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${cfg.badge}`}>
                        {row.priority}
                      </span>
                      {row.read && <CheckCheck size={11} className="text-slate-400" />}
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">{fmtTime(row.createdAt)}</p>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
          No notifications yet. You're all caught up.
        </div>
      )}
    </section>
  );
};

export default NotificationsPanel;
