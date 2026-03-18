import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { FileText, Radio, Eye, TrendingUp, Clock } from "lucide-react";
import { fetchAdvisoryOverview } from "../../api/advisoryApi";

const CARDS = [
  { key: "total",          label: "Total",       icon: FileText,   accent: "bg-slate-100 text-slate-600",   val: "bg-slate-50" },
  { key: "active",         label: "Active",      icon: Radio,      accent: "bg-emerald-100 text-emerald-700", val: "bg-emerald-50" },
  { key: "totalReach",     label: "Reach",       icon: Eye,        accent: "bg-sky-100 text-sky-700",        val: "bg-sky-50" },
  { key: "engagementRate", label: "Engagement",  icon: TrendingUp, accent: "bg-amber-100 text-amber-700",   val: "bg-amber-50", suffix: "%" },
  { key: "scheduled",      label: "Scheduled",   icon: Clock,      accent: "bg-purple-100 text-purple-700", val: "bg-purple-50" },
];

export default function AdvisoryOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ["advisory-overview"],
    queryFn: fetchAdvisoryOverview,
    staleTime: 60_000,
  });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {CARDS.map(({ key, label, icon: Icon, accent, val, suffix }, i) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 shadow-sm"
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${accent}`}>
            <Icon size={15} />
          </div>
          <div className="min-w-0">
            {isLoading ? (
              <div className="h-5 w-10 bg-slate-100 rounded animate-pulse mb-1" />
            ) : (
              <p className="text-xl font-bold text-slate-900 leading-tight">
                {(data?.[key] ?? 0).toLocaleString()}{suffix || ""}
              </p>
            )}
            <p className="text-[11px] text-slate-500 truncate">{label}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
