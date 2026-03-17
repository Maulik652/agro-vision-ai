import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, Edit2, Trash2, Send, Archive, Loader2, Filter, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchAdvisoryFeed, deleteAdvisory, publishAdvisory, changeAdvisoryStatus } from "../../api/advisoryApi";
import toast from "react-hot-toast";

const STATUS_STYLE = {
  draft:     "bg-slate-100 text-slate-600",
  scheduled: "bg-purple-100 text-purple-700",
  published: "bg-sky-100 text-sky-700",
  active:    "bg-emerald-100 text-emerald-700",
  expired:   "bg-amber-100 text-amber-700",
  archived:  "bg-slate-100 text-slate-400"
};
const CATEGORY_STYLE = {
  crop:       "bg-emerald-50 text-emerald-700",
  market:     "bg-blue-50 text-blue-700",
  disease:    "bg-red-50 text-red-700",
  weather:    "bg-sky-50 text-sky-700",
  pest:       "bg-orange-50 text-orange-700",
  irrigation: "bg-cyan-50 text-cyan-700",
  general:    "bg-slate-50 text-slate-600"
};
const PRIORITY_DOT = { urgent: "bg-red-500", high: "bg-orange-400", medium: "bg-amber-400", low: "bg-slate-300" };
const STATUSES = ["all", "draft", "scheduled", "active", "published", "expired", "archived"];
const CATEGORIES = ["all", "crop", "market", "disease", "weather", "pest", "irrigation", "general"];

export default function AdvisoryFeed({ onEdit, onView }) {
  const qc = useQueryClient();
  const [status, setStatus]     = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch]     = useState("");
  const [page, setPage]         = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["advisory-feed", status, category, page],
    queryFn: () => fetchAdvisoryFeed({ status: status || undefined, category: category || undefined, page, limit: 10 }),
    staleTime: 30_000
  });

  const advisories = data?.advisories || [];
  const totalPages = data?.pages || 1;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["advisory-feed"] });
    qc.invalidateQueries({ queryKey: ["advisory-overview"] });
  };

  const deleteMut = useMutation({
    mutationFn: deleteAdvisory,
    onSuccess: () => { toast.success("Deleted"); invalidate(); },
    onError: () => toast.error("Delete failed")
  });

  const publishMut = useMutation({
    mutationFn: publishAdvisory,
    onSuccess: () => { toast.success("Published"); invalidate(); },
    onError: (e) => toast.error(e?.response?.data?.message || "Publish failed")
  });

  const archiveMut = useMutation({
    mutationFn: (id) => changeAdvisoryStatus(id, "archived"),
    onSuccess: () => { toast.success("Archived"); invalidate(); },
    onError: () => toast.error("Archive failed")
  });

  const filtered = search
    ? advisories.filter(a => a.title.toLowerCase().includes(search.toLowerCase()) || a.category.includes(search.toLowerCase()))
    : advisories;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Filters */}
      <div className="px-5 py-4 border-b border-slate-100 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search advisories..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl pl-8 pr-3 py-2 text-xs outline-none focus:border-emerald-400 transition" />
          </div>
          <Filter size={14} className="text-slate-400 shrink-0" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUSES.map(s => (
            <button key={s} onClick={() => { setStatus(s === "all" ? "" : s); setPage(1); }}
              className={`px-2.5 py-1 rounded-lg text-[11px] capitalize transition ${(status === s || (!status && s === "all")) ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => { setCategory(c === "all" ? "" : c); setPage(1); }}
              className={`px-2.5 py-1 rounded-lg text-[11px] capitalize transition ${(category === c || (!category && c === "all")) ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-slate-50">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-emerald-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">No advisories found</div>
        ) : (
          filtered.map((a, i) => (
            <motion.div key={a._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition group">
              {/* Priority dot */}
              <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${PRIORITY_DOT[a.priority] || PRIORITY_DOT.medium}`} />

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${CATEGORY_STYLE[a.category] || CATEGORY_STYLE.general}`}>{a.category}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLE[a.status] || STATUS_STYLE.draft}`}>{a.status}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 truncate">{a.title}</h3>
                    {a.summary && <p className="text-xs text-slate-500 mt-0.5 truncate">{a.summary}</p>}
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1"><Eye size={10} /> {a.views || 0} views</span>
                      <span>{a.reach || 0} reach</span>
                      {a.publishedAt && (
                        <span>{new Date(a.publishedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                    <button onClick={() => onView?.(a)} title="View"
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition">
                      <Eye size={14} />
                    </button>
                    {["draft", "scheduled"].includes(a.status) && (
                      <button onClick={() => onEdit?.(a)} title="Edit"
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition">
                        <Edit2 size={14} />
                      </button>
                    )}
                    {["draft", "scheduled"].includes(a.status) && (
                      <button onClick={() => publishMut.mutate(a._id)} disabled={publishMut.isPending} title="Publish"
                        className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition">
                        <Send size={14} />
                      </button>
                    )}
                    {["active", "published"].includes(a.status) && (
                      <button onClick={() => archiveMut.mutate(a._id)} disabled={archiveMut.isPending} title="Archive"
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">
                        <Archive size={14} />
                      </button>
                    )}
                    <button onClick={() => deleteMut.mutate(a._id)} disabled={deleteMut.isPending} title="Delete"
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
          <p className="text-xs text-slate-400">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
