import { motion, AnimatePresence } from "framer-motion";
import { Bell, AlertTriangle, TrendingUp, Package, X } from "lucide-react";
import { useExpertDashboardStore } from "../../store/expertDashboardStore";

const alertIcon = {
  price_spike:   { icon: TrendingUp,    color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" },
  disease_alert: { icon: AlertTriangle, color: "text-red-600",    bg: "bg-red-50 border-red-200" },
  supply_drop:   { icon: Package,       color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
  default:       { icon: Bell,          color: "text-blue-600",   bg: "bg-blue-50 border-blue-200" }
};

export default function AlertsPanel() {
  const { alerts, clearAlerts, isSocketConnected } = useExpertDashboardStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-red-500" />
          <h2 className="text-slate-800 font-semibold text-base">Real-Time Alerts</h2>
          <span className={`w-2 h-2 rounded-full ${isSocketConnected ? "bg-emerald-400" : "bg-red-400"}`} />
        </div>
        {alerts.length > 0 && (
          <button onClick={clearAlerts} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition">
            <X size={12} /> Clear
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        <AnimatePresence>
          {alerts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="h-24 flex flex-col items-center justify-center gap-2 text-slate-400"
            >
              <Bell size={24} className="opacity-30" />
              <p className="text-sm">No alerts — all systems normal</p>
            </motion.div>
          ) : (
            alerts.map((a) => {
              const cfg = alertIcon[a.type] || alertIcon.default;
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`flex items-start gap-3 border rounded-xl px-4 py-3 ${cfg.bg}`}
                >
                  <Icon size={15} className={`${cfg.color} mt-0.5 shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 font-medium">{a.title || a.type}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{a.message}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {new Date(a.ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
