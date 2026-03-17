import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BookOpen, ArrowRight, Loader2, Zap, AlertTriangle, TrendingUp, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchPublicAdvisories } from "../../api/publicAdvisoryApi.js";
import AdvisoryDetailModal from "./AdvisoryDetailModal.jsx";

const CATEGORY_COLOR = {
  crop: "bg-emerald-100 text-emerald-700", market: "bg-blue-100 text-blue-700",
  disease: "bg-red-100 text-red-700", weather: "bg-sky-100 text-sky-700",
  pest: "bg-orange-100 text-orange-700", irrigation: "bg-cyan-100 text-cyan-700",
  general: "bg-slate-100 text-slate-600"
};

const PRIORITY_ICON = {
  urgent: <Zap size={11} className="text-red-500" />,
  high:   <AlertTriangle size={11} className="text-orange-500" />,
  medium: <TrendingUp size={11} className="text-amber-500" />,
  low:    <Info size={11} className="text-slate-400" />
};

// role: "farmer" | "buyer"
const AdvisoryDashboardWidget = ({ role = "farmer" }) => {
  const navigate = useNavigate();
  const [viewId, setViewId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["pub-advisories-widget", role],
    queryFn: () => fetchPublicAdvisories({ page: 1, limit: 5 }),
    staleTime: 60_000
  });

  const advisories = data?.advisories || [];
  const advisoryPath = role === "farmer" ? "/farmer/advisory" : "/buyer/advisory";

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <BookOpen size={15} className="text-emerald-700" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Expert Advisories</h3>
            <p className="text-[11px] text-slate-400">Latest from agricultural experts</p>
          </div>
        </div>
        <button onClick={() => navigate(advisoryPath)}
          className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium transition">
          View all <ArrowRight size={12} />
        </button>
      </div>

      {/* List */}
      <div className="divide-y divide-slate-50">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-emerald-400" />
          </div>
        ) : advisories.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs">
            <BookOpen size={24} className="mx-auto mb-2 opacity-30" />
            No advisories published yet
          </div>
        ) : (
          advisories.map((a, i) => {
            const cat = CATEGORY_COLOR[a.category] || CATEGORY_COLOR.general;
            return (
              <motion.button key={a._id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setViewId(a._id)}
                className="w-full flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 transition text-left group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    {PRIORITY_ICON[a.priority]}
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cat}`}>{a.category}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 line-clamp-1 group-hover:text-emerald-700 transition">{a.title}</p>
                  {a.summary && <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{a.summary}</p>}
                </div>
                <ArrowRight size={13} className="text-slate-300 group-hover:text-emerald-500 transition shrink-0 mt-1" />
              </motion.button>
            );
          })
        )}
      </div>

      {/* Footer */}
      {!isLoading && advisories.length > 0 && (
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
          <button onClick={() => navigate(advisoryPath)}
            className="w-full text-xs text-center text-emerald-600 hover:text-emerald-700 font-medium transition flex items-center justify-center gap-1">
            See all {data?.total || ""} advisories <ArrowRight size={12} />
          </button>
        </div>
      )}

      <AdvisoryDetailModal advisoryId={viewId} open={!!viewId} onClose={() => setViewId(null)} />
    </div>
  );
};

export default AdvisoryDashboardWidget;
