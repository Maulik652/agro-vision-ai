import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ShieldAlert, CheckCircle, AlertTriangle } from "lucide-react";
import { fetchFraudAlerts, resolveFraudAlert } from "../../api/adminApi";
import AlertsPanel from "../../components/admin/AlertsPanel";
import toast from "react-hot-toast";

export default function FraudAlertsPage() {
  const qc = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["admin-fraud-alerts"],
    queryFn: fetchFraudAlerts,
    refetchInterval: 30000,
  });

  const resolveMut = useMutation({
    mutationFn: ({ id, userId }) => resolveFraudAlert(id, { userId }),
    onSuccess: () => { qc.invalidateQueries(["admin-fraud-alerts"]); toast.success("Alert resolved"); },
    onError: () => toast.error("Failed"),
  });

  const critical = alerts.filter((a) => a.severity === "high");
  const warnings = alerts.filter((a) => a.severity === "medium");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
          Fraud Detection System
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Real-time fraud monitoring and alerts</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-red-50 border border-red-200 p-5">
          <ShieldAlert size={20} className="text-red-600 mb-2" />
          <p className="text-2xl font-bold text-red-700">{critical.length}</p>
          <p className="text-sm text-red-600 font-medium">Critical Alerts</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl bg-amber-50 border border-amber-200 p-5">
          <AlertTriangle size={20} className="text-amber-600 mb-2" />
          <p className="text-2xl font-bold text-amber-700">{warnings.length}</p>
          <p className="text-sm text-amber-600 font-medium">Warnings</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl bg-green-50 border border-green-200 p-5">
          <CheckCircle size={20} className="text-green-600 mb-2" />
          <p className="text-2xl font-bold text-green-700">{alerts.length}</p>
          <p className="text-sm text-green-600 font-medium">Total Alerts</p>
        </motion.div>
      </div>

      {/* Alerts List */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-sm" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
            Active Alerts
          </h3>
        </div>
        <div className="p-5 space-y-3">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
              ))
            : alerts.map((alert, i) => {
                const isHigh = alert.severity === "high";
                return (
                  <motion.div
                    key={alert._id || i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`flex items-start gap-3 p-4 rounded-xl border ${
                      isHigh ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${isHigh ? "bg-red-500" : "bg-amber-500"}`} />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${isHigh ? "text-red-700" : "text-amber-700"}`}>{alert.message}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{new Date(alert.createdAt).toLocaleString()}</p>
                    </div>
                    <button
                      onClick={() => resolveMut.mutate({ id: alert._id, userId: alert.user?._id })}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition shrink-0"
                    >
                      <CheckCircle size={11} /> Resolve
                    </button>
                  </motion.div>
                );
              })}
          {!isLoading && alerts.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-sm">
              <ShieldAlert size={32} className="mx-auto mb-2 opacity-30" />
              No active fraud alerts
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
