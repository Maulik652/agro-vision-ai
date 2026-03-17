import React from "react";
import { motion } from "framer-motion";
import { Eye, Calendar, User, ChevronRight, Zap, AlertTriangle, Info, TrendingUp } from "lucide-react";

const CATEGORY_META = {
  crop:       { color: "bg-emerald-100 text-emerald-700", label: "Crop" },
  market:     { color: "bg-blue-100 text-blue-700",       label: "Market" },
  disease:    { color: "bg-red-100 text-red-700",         label: "Disease" },
  weather:    { color: "bg-sky-100 text-sky-700",         label: "Weather" },
  pest:       { color: "bg-orange-100 text-orange-700",   label: "Pest" },
  irrigation: { color: "bg-cyan-100 text-cyan-700",       label: "Irrigation" },
  general:    { color: "bg-slate-100 text-slate-600",     label: "General" }
};

const PRIORITY_META = {
  urgent: { icon: Zap,           color: "text-red-600 bg-red-50 border-red-200",    label: "Urgent" },
  high:   { icon: AlertTriangle, color: "text-orange-600 bg-orange-50 border-orange-200", label: "High" },
  medium: { icon: TrendingUp,    color: "text-amber-600 bg-amber-50 border-amber-200",    label: "Medium" },
  low:    { icon: Info,          color: "text-slate-500 bg-slate-50 border-slate-200",    label: "Low" }
};

const AdvisoryCard = ({ advisory, onClick, index = 0 }) => {
  const cat  = CATEGORY_META[advisory.category] || CATEGORY_META.general;
  const pri  = PRIORITY_META[advisory.priority] || PRIORITY_META.low;
  const PriIcon = pri.icon;
  const isUrgent = advisory.priority === "urgent";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => onClick?.(advisory)}
      className={`bg-white border rounded-2xl p-5 cursor-pointer hover:shadow-md transition-all group ${
        isUrgent ? "border-red-200 shadow-red-50" : "border-slate-200 shadow-sm"
      }`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${cat.color}`}>{cat.label}</span>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${pri.color}`}>
            <PriIcon size={10} /> {pri.label}
          </span>
        </div>
        <ChevronRight size={16} className="text-slate-300 group-hover:text-emerald-500 transition-colors shrink-0 mt-0.5" />
      </div>

      {/* Title */}
      <h3 className="font-semibold text-slate-900 text-sm leading-snug mb-2 line-clamp-2">{advisory.title}</h3>

      {/* Summary */}
      {advisory.summary && (
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3">{advisory.summary}</p>
      )}

      {/* Crop tags */}
      {advisory.cropTypes?.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-3">
          {advisory.cropTypes.slice(0, 3).map(c => (
            <span key={c} className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">{c}</span>
          ))}
          {advisory.cropTypes.length > 3 && (
            <span className="text-[10px] text-slate-400">+{advisory.cropTypes.length - 3} more</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <User size={11} />
          <span>{advisory.createdBy?.name || "Expert"}</span>
          {advisory.createdBy?.qualification && (
            <span className="text-slate-300">· {advisory.createdBy.qualification}</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1"><Eye size={11} /> {advisory.views || 0}</span>
          {advisory.publishedAt && (
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {new Date(advisory.publishedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default AdvisoryCard;
