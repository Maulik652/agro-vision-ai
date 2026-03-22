/**
 * BroadcastBanner
 * Shows live broadcast alerts received via socket.
 * Used on both farmer and buyer advisory pages.
 */
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Zap, Info, TrendingUp, X, Radio } from "lucide-react";

const PRIORITY_STYLE = {
  urgent: { bg: "bg-red-50 border-red-300",    text: "text-red-800",    icon: Zap,           iconColor: "text-red-600",    badge: "bg-red-600 text-white" },
  high:   { bg: "bg-orange-50 border-orange-300", text: "text-orange-800", icon: AlertTriangle, iconColor: "text-orange-600", badge: "bg-orange-500 text-white" },
  medium: { bg: "bg-amber-50 border-amber-300", text: "text-amber-800",  icon: TrendingUp,    iconColor: "text-amber-600",  badge: "bg-amber-500 text-white" },
  low:    { bg: "bg-slate-50 border-slate-300", text: "text-slate-700",  icon: Info,          iconColor: "text-slate-500",  badge: "bg-slate-500 text-white" },
};

export default function BroadcastBanner({ alerts, onDismiss, onDismissAll }) {
  if (!alerts?.length) return null;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <Radio size={12} className="text-red-500" />
          <span>Live Broadcasts</span>
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        </div>
        {alerts.length > 1 && (
          <button onClick={onDismissAll} className="text-[10px] text-slate-400 hover:text-slate-600 transition">
            Dismiss all
          </button>
        )}
      </div>

      <AnimatePresence>
        {alerts.map((alert) => {
          const style = PRIORITY_STYLE[alert.priority] || PRIORITY_STYLE.medium;
          const Icon = style.icon;
          return (
            <motion.div
              key={alert._id || alert.id}
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.96 }}
              transition={{ duration: 0.22 }}
              className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-sm ${style.bg}`}
            >
              <div className={`mt-0.5 shrink-0 ${style.iconColor}`}>
                <Icon size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${style.badge}`}>
                    {alert.priority || "alert"}
                  </span>
                  {alert.category && (
                    <span className="text-[10px] text-slate-500 capitalize">{alert.category}</span>
                  )}
                  <span className="text-[10px] text-slate-400 ml-auto">
                    {alert.emittedAt
                      ? new Date(alert.emittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "Just now"}
                  </span>
                </div>
                <p className={`text-sm font-semibold leading-snug ${style.text}`}>{alert.title}</p>
                {alert.message && (
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed line-clamp-2">{alert.message}</p>
                )}
              </div>
              <button
                onClick={() => onDismiss?.(alert._id || alert.id)}
                className="shrink-0 text-slate-400 hover:text-slate-600 transition mt-0.5"
              >
                <X size={13} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
