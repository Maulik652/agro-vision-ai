import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { FileText, Radio, Eye, TrendingUp, Clock, Loader2 } from "lucide-react";
import { fetchAdvisoryOverview } from "../../api/advisoryApi";

const CARDS = [
  { key: "total",          label: "Total Advisories", icon: FileText,   color: "bg-slate-100 text-slate-600" },
  { key: "active",         label: "Active",           icon: Radio,      color: "bg-emerald-100 text-emerald-700" },
  { key: "totalReach",     label: "Total Reach",      icon: Eye,        color: "bg-sky-100 text-sky-700" },
  { key: "engagementRate", label: "Engagement Rate",  icon: TrendingUp, color: "bg-amber-100 text-amber-700", suffix: "%" },
  { key: "scheduled",      label: "Scheduled",        icon: Clock,      color: "bg-purple-100 text-purple-700" }
];

export default function AdvisoryOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ["advisory-overview"],
    queryFn: fetchAdvisoryOverview,
    staleTime: 60_000
  });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {CARDS.map(({ key, label, icon: Icon, color, suffix }, i) => (
        <motion.div key={key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
            <Icon size={16} />
          </div>
          {isLoading ? (
            <Loader2 size={18} className="animate-spin text-slate-300" />
          ) : (
            <p className="text-2xl font-bold text-slate-900">
              {(data?.[key] ?? 0).toLocaleString()}{suffix || ""}
            </p>
          )}
          <p className="text-xs text-slate-500 mt-1">{label}</p>
        </motion.div>
      ))}
    </div>
  );
}
