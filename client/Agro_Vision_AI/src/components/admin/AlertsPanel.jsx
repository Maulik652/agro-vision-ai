import { motion } from "framer-motion";
import { ShieldAlert, AlertTriangle, Info, X } from "lucide-react";

const SEVERITY = {
  high: { icon: ShieldAlert, bg: "bg-red-50", border: "border-red-200", text: "text-red-700", dot: "bg-red-500", label: "Critical" },
  medium: { icon: AlertTriangle, bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500", label: "Warning" },
  low: { icon: Info, bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", dot: "bg-blue-400", label: "Info" },
};

export default function AlertsPanel({ alerts = [], onDismiss }) {
  if (!alerts.length) return null;

  return (
    <div className="space-y-2">
      {alerts.slice(0, 5).map((alert, i) => {
        const cfg = SEVERITY[alert.severity] || SEVERITY.medium;
        const Icon = cfg.icon;
        return (
          <motion.div
            key={alert._id || i}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.06 }}
            className={`flex items-start gap-3 p-3.5 rounded-xl border ${cfg.bg} ${cfg.border}`}
          >
            <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-[10px] font-bold uppercase tracking-wide ${cfg.text}`}>{cfg.label}</span>
              </div>
              <p className={`text-xs font-medium ${cfg.text}`}>{alert.message}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{new Date(alert.createdAt).toLocaleString()}</p>
            </div>
            {onDismiss && (
              <button onClick={() => onDismiss(alert._id)} className="text-slate-400 hover:text-slate-600 transition shrink-0">
                <X size={13} />
              </button>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
