import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { X, Eye, Users, TrendingUp, Calendar, MapPin, Leaf, Tag, Loader2 } from "lucide-react";
import { fetchAdvisoryById } from "../../api/advisoryApi";

const STATUS_STYLE = {
  draft: "bg-slate-100 text-slate-600", scheduled: "bg-purple-100 text-purple-700",
  published: "bg-sky-100 text-sky-700", active: "bg-emerald-100 text-emerald-700",
  expired: "bg-amber-100 text-amber-700", archived: "bg-slate-100 text-slate-400"
};
const PRIORITY_STYLE = {
  urgent: "bg-red-100 text-red-700", high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700", low: "bg-slate-100 text-slate-600"
};

function StatBox({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
      <Icon size={14} className={`mx-auto mb-1 ${color}`} />
      <p className="text-lg font-bold text-slate-900">{value?.toLocaleString() || 0}</p>
      <p className="text-[10px] text-slate-400">{label}</p>
    </div>
  );
}

export default function AdvisoryDetail({ advisoryId, open, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ["advisory-detail", advisoryId],
    queryFn: () => fetchAdvisoryById(advisoryId),
    enabled: !!advisoryId && open,
    staleTime: 60_000
  });

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
            className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <p className="text-sm font-semibold text-slate-900">Advisory Detail</p>
              <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
                <X size={16} />
              </button>
            </div>

            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-emerald-500" />
              </div>
            ) : !data ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Not found</div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_STYLE[data.status] || STATUS_STYLE.draft}`}>{data.status}</span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${PRIORITY_STYLE[data.priority] || PRIORITY_STYLE.medium}`}>{data.priority}</span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 capitalize">{data.category}</span>
                </div>

                {/* Title */}
                <h1 className="text-xl font-bold text-slate-900">{data.title}</h1>
                {data.summary && <p className="text-sm text-slate-500 italic">{data.summary}</p>}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <StatBox icon={Eye}       label="Views"  value={data.views}  color="text-sky-600" />
                  <StatBox icon={Users}     label="Reach"  value={data.reach}  color="text-emerald-600" />
                  <StatBox icon={TrendingUp} label="Clicks" value={data.clicks} color="text-amber-600" />
                </div>

                {/* Content */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{data.content}</p>
                </div>

                {/* Targeting */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-700">Targeting</p>
                  <div className="grid grid-cols-2 gap-3">
                    {data.targetAudience?.length > 0 && (
                      <div className="flex items-start gap-2">
                        <Users size={13} className="text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] text-slate-400">Audience</p>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {data.targetAudience.map(a => <span key={a} className="text-xs px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 capitalize">{a}</span>)}
                          </div>
                        </div>
                      </div>
                    )}
                    {data.regions?.length > 0 && (
                      <div className="flex items-start gap-2">
                        <MapPin size={13} className="text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] text-slate-400">Regions</p>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {data.regions.map(r => <span key={r} className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{r}</span>)}
                          </div>
                        </div>
                      </div>
                    )}
                    {data.cropTypes?.length > 0 && (
                      <div className="flex items-start gap-2">
                        <Leaf size={13} className="text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] text-slate-400">Crops</p>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {data.cropTypes.map(c => <span key={c} className="text-xs px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">{c}</span>)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dates */}
                <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-100">
                  <span className="flex items-center gap-1"><Calendar size={11} /> Created {new Date(data.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                  {data.publishedAt && <span>Published {new Date(data.publishedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
