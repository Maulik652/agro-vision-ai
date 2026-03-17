import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Calendar, Eye, Tag, MapPin, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchPublicAdvisoryById } from "../../api/publicAdvisoryApi.js";

const CATEGORY_COLOR = {
  crop: "bg-emerald-100 text-emerald-700", market: "bg-blue-100 text-blue-700",
  disease: "bg-red-100 text-red-700", weather: "bg-sky-100 text-sky-700",
  pest: "bg-orange-100 text-orange-700", irrigation: "bg-cyan-100 text-cyan-700",
  general: "bg-slate-100 text-slate-600"
};

const AdvisoryDetailModal = ({ advisoryId, open, onClose }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["pub-advisory-detail", advisoryId],
    queryFn: () => fetchPublicAdvisoryById(advisoryId),
    enabled: !!advisoryId && open,
    staleTime: 60_000
  });

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={onClose}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900 text-base">Advisory Detail</h2>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-6 py-5">
              {isLoading ? (
                <div className="space-y-3">
                  {[1,2,3,4].map(i => <div key={i} className="h-5 bg-slate-100 rounded animate-pulse" />)}
                </div>
              ) : !data ? (
                <p className="text-slate-400 text-sm text-center py-8">Advisory not found</p>
              ) : (
                <div className="space-y-5">
                  {/* Category + Priority */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${CATEGORY_COLOR[data.category] || CATEGORY_COLOR.general}`}>{data.category}</span>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 capitalize">{data.priority} priority</span>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 capitalize">{data.status}</span>
                  </div>

                  {/* Title */}
                  <h1 className="text-xl font-bold text-slate-900 leading-snug">{data.title}</h1>

                  {/* Meta */}
                  <div className="flex flex-wrap gap-4 text-xs text-slate-500 pb-4 border-b border-slate-100">
                    <span className="flex items-center gap-1.5"><User size={12} /> {data.createdBy?.name || "Expert"}{data.createdBy?.qualification ? ` · ${data.createdBy.qualification}` : ""}</span>
                    {data.publishedAt && <span className="flex items-center gap-1.5"><Calendar size={12} /> {new Date(data.publishedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</span>}
                    <span className="flex items-center gap-1.5"><Eye size={12} /> {data.views || 0} views</span>
                    {data.reach > 0 && <span className="flex items-center gap-1.5"><Users size={12} /> {data.reach} reached</span>}
                  </div>

                  {/* Content */}
                  <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap text-sm">
                    {data.content}
                  </div>

                  {/* Targeting info */}
                  {(data.cropTypes?.length > 0 || data.regions?.length > 0) && (
                    <div className="pt-4 border-t border-slate-100 space-y-3">
                      {data.cropTypes?.length > 0 && (
                        <div className="flex items-start gap-2">
                          <Tag size={13} className="text-slate-400 mt-0.5 shrink-0" />
                          <div className="flex gap-1.5 flex-wrap">
                            {data.cropTypes.map(c => (
                              <span key={c} className="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">{c}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {data.regions?.length > 0 && (
                        <div className="flex items-start gap-2">
                          <MapPin size={13} className="text-slate-400 mt-0.5 shrink-0" />
                          <div className="flex gap-1.5 flex-wrap">
                            {data.regions.map(r => (
                              <span key={r} className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">{r}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AdvisoryDetailModal;
