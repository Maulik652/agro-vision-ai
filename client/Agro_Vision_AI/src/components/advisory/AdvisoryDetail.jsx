import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { X, Eye, Users, TrendingUp, Calendar, MapPin, Leaf, Loader2 } from "lucide-react";
import { fetchAdvisoryById } from "../../api/advisoryApi";

const STATUS_STYLE = {
  draft:     "bg-slate-100 text-slate-600 border-slate-200",
  scheduled: "bg-purple-50 text-purple-700 border-purple-200",
  published: "bg-sky-50 text-sky-700 border-sky-200",
  active:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  expired:   "bg-amber-50 text-amber-700 border-amber-200",
  archived:  "bg-slate-50 text-slate-400 border-slate-200",
};
const PRIORITY_STYLE = {
  urgent: "bg-red-50 text-red-700 border-red-200",
  high:   "bg-orange-50 text-orange-700 border-orange-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low:    "bg-slate-100 text-slate-600 border-slate-200",
};

function Stat({ icon: Icon, label, value, color }) {
  return (
    <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
      <Icon size={13} className={`mx-auto mb-1.5 ${color}`} />
      <p className="text-lg font-bold text-slate-900 leading-tight">{(value || 0).toLocaleString()}</p>
      <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}

export default function AdvisoryDetail({ advisoryId, open, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ["advisory-detail", advisoryId],
    queryFn: () => fetchAdvisoryById(advisoryId),
    enabled: !!advisoryId && open,
    staleTime: 60_000,
  });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={e => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.96, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 12 }}
            transition={{ duration: 0.18 }}
            className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <p className="text-sm font-semibold text-slate-900">Advisory Detail</p>
              <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
                <X size={15} />
              </button>
            </div>

            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-emerald-500" />
              </div>
            ) : !data ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Advisory not found</div>
            ) : (
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize border ${STATUS_STYLE[data.status] || STATUS_STYLE.draft}`}>
                    {data.status}
                  </span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize border ${PRIORITY_STYLE[data.priority] || PRIORITY_STYLE.medium}`}>
                    {data.priority}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 capitalize border border-slate-200">
                    {data.category}
                  </span>
                </div>

                {/* Title + summary */}
                <div>
                  <h1 className="text-xl font-bold text-slate-900 leading-snug">{data.title}</h1>
                  {data.summary && (
                    <p className="text-sm text-slate-500 mt-1.5 italic border-l-2 border-slate-200 pl-3">{data.summary}</p>
                  )}
                </div>

                {/* Stats */}
                <div className="flex gap-3">
                  <Stat icon={Eye}        label="Views"  value={data.views}  color="text-sky-600" />
                  <Stat icon={Users}      label="Reach"  value={data.reach}  color="text-emerald-600" />
                  <Stat icon={TrendingUp} label="Clicks" value={data.clicks} color="text-amber-600" />
                </div>

                {/* Content */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{data.content}</p>
                </div>

                {/* Targeting */}
                {(data.targetAudience?.length > 0 || data.regions?.length > 0 || data.cropTypes?.length > 0) && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-700">Targeting</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {data.targetAudience?.length > 0 && (
                        <div className="flex items-start gap-2">
                          <Users size={12} className="text-slate-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[10px] text-slate-400 mb-1">Audience</p>
                            <div className="flex flex-wrap gap-1">
                              {data.targetAudience.map(a => (
                                <span key={a} className="text-xs px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 capitalize border border-sky-100">{a}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      {data.regions?.length > 0 && (
                        <div className="flex items-start gap-2">
                          <MapPin size={12} className="text-slate-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[10px] text-slate-400 mb-1">Regions</p>
                            <div className="flex flex-wrap gap-1">
                              {data.regions.map(r => (
                                <span key={r} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">{r}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      {data.cropTypes?.length > 0 && (
                        <div className="flex items-start gap-2">
                          <Leaf size={12} className="text-slate-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[10px] text-slate-400 mb-1">Crops</p>
                            <div className="flex flex-wrap gap-1">
                              {data.cropTypes.map(c => (
                                <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">{c}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Dates */}
                <div className="flex items-center gap-4 text-xs text-slate-400 pt-3 border-t border-slate-100">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={11} />
                    Created {new Date(data.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                  {data.publishedAt && (
                    <span>Published {new Date(data.publishedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
