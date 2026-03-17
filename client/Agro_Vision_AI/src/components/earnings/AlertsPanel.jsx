import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, XCircle, CheckCircle, Bell, X } from "lucide-react";

const MOCK_ALERTS = [
  { id: 1, type: "large_transaction", message: "Large transaction detected: ₹85,000 from Buyer #4421", time: "2m ago", severity: "warning" },
  { id: 2, type: "payment_failed",    message: "Payment failed for Order #ORD-8821 — Razorpay timeout", time: "8m ago", severity: "error" },
  { id: 3, type: "payout_released",   message: "Payout of ₹12,400 released to Farmer Ramesh Patel",   time: "15m ago", severity: "success" },
];

const SEVERITY = {
  warning: { icon: AlertTriangle, bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-700",   icon_color: "text-amber-500"  },
  error:   { icon: XCircle,       bg: "bg-red-50",     border: "border-red-200",     text: "text-red-700",     icon_color: "text-red-500"    },
  success: { icon: CheckCircle,   bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", icon_color: "text-emerald-500" },
};

const AlertsPanel = () => {
  const [alerts, setAlerts] = useState(MOCK_ALERTS);

  const dismiss = (id) => setAlerts(a => a.filter(x => x.id !== id));

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
          <Bell size={15} className="text-amber-700" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800">Real-time Alerts</h3>
        {alerts.length > 0 && (
          <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">{alerts.length}</span>
        )}
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {alerts.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No active alerts</p>
          ) : alerts.map(alert => {
            const cfg = SEVERITY[alert.severity] || SEVERITY.warning;
            const Icon = cfg.icon;
            return (
              <motion.div key={alert.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                className={`flex items-start gap-2.5 p-3 rounded-xl border ${cfg.bg} ${cfg.border}`}>
                <Icon size={14} className={`${cfg.icon_color} shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${cfg.text} leading-snug`}>{alert.message}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{alert.time}</p>
                </div>
                <button onClick={() => dismiss(alert.id)} className="shrink-0 p-0.5 rounded hover:bg-white/60 text-slate-400 transition-colors">
                  <X size={11} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AlertsPanel;
