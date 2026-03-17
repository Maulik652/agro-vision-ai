import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { History, Loader2, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchAdvisoryHistory } from "../../api/advisoryApi";

const STATUS_STYLE = {
  active:   "bg-emerald-100 text-emerald-700",
  published:"bg-sky-100 text-sky-700",
  expired:  "bg-amber-100 text-amber-700",
  archived: "bg-slate-100 text-slate-500"
};
const CATS = ["all", "crop", "market", "disease", "weather", "pest", "irrigation", "general"];

export default function AdvisoryHistory({ onView }) {
  const [category, setCategory] = useState("");
  const [from, setFrom]         = useState("");
  const [to, setTo]             = useState("");
  const [page, setPage]         = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["advisory-history", category, from, to, page],
    queryFn: () => fetchAdvisoryHistory({ category: category || undefined, from: from || undefined, to: to || undefined, page, limit: 12 }),
    staleTime: 60_000
  });

  const advisories = data?.advisories || [];
  const totalPages = data?.pages || 1;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
        <History size={15} className="text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-900">Advisory History</h2>
        {data?.total != null && (
          <span className="ml-auto text-xs text-slate-400">{data.total} total</span>
        )}
      </div>

      {/* Filters */}
      <div className="px-5 py-3 border-b border-slate-50 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {CATS.map(c => (
            <button key={c} onClick={() => { setCategory(c === "all" ? "" : c); setPage(1); }}
              className={`px-2.5 py-1 rounded-lg text-[11px] capitalize transition ${(category === c || (!category && c === "all")) ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-[10px] text-slate-400 block mb-1">From</label>
            <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-1.5 text-xs outline-none" />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-slate-400 block mb-1">To</label>
            <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-1.5 text-xs outline-none" />
          </div>
          {(from || to || category) && (
            <button onClick={() => { setCategory(""); setFrom(""); setTo(""); setPage(1); }}
              className="self-end px-3 py-1.5 rounded-lg text-xs text-slate-500 border border-slate-200 hover:bg-slate-50 transition">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-slate-50">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={22} className="animate-spin text-slate-400" />
          </div>
        ) : advisories.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No history found</div>
        ) : (
          advisories.map((a, i) => (
            <motion.div key={a._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLE[a.status] || STATUS_STYLE.archived}`}>{a.status}</span>
                  <span className="text-[10px] text-slate-400 capitalize">{a.category}</span>
                </div>
                <p className="text-sm font-medium text-slate-800 truncate">{a.title}</p>
                <div className="flex items-center gap-3 mt-0.5 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1"><Eye size={9} /> {a.views || 0}</span>
                  <span>{a.reach || 0} reach</span>
                  {a.publishedAt && <span>{new Date(a.publishedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>}
                </div>
              </div>
              <button onClick={() => onView?.(a)} title="View"
                className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition">
                <Eye size={14} />
              </button>
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
