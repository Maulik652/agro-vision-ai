import { motion } from "framer-motion";
import { Clock, CheckCircle, Activity, Timer, Loader2 } from "lucide-react";

const cards = [
  { key: "pending",          label: "Pending Requests",    icon: Clock,        color: "from-yellow-500 to-orange-500" },
  { key: "active",           label: "Active Consultations",icon: Activity,     color: "from-blue-500 to-cyan-500" },
  { key: "completed",        label: "Completed",           icon: CheckCircle,  color: "from-emerald-500 to-teal-500" },
  { key: "avgResponseHours", label: "Avg Response Time",   icon: Timer,        color: "from-purple-500 to-pink-500", suffix: "h" }
];

export default function ConsultationOverview({ data, isLoading }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <motion.div
            key={c.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm p-6"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${c.color} opacity-10 rounded-2xl`} />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{c.label}</p>
                {isLoading
                  ? <Loader2 className="mt-2 animate-spin text-slate-300" size={22} />
                  : <p className="mt-1 text-2xl font-bold text-slate-900">{data?.[c.key] ?? 0}{c.suffix || ""}</p>
                }
              </div>
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${c.color} shadow-md`}>
                <Icon size={20} className="text-white" />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
