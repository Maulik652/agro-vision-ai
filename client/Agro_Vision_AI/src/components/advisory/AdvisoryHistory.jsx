import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { History, Loader2, Eye, ChevronLeft, ChevronRight, X, CalendarDays } from "lucide-react";
import { fetchAdvisoryHistory } from "../../api/advisoryApi";

const STATUS_STYLE = {
  active:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  published: "bg-sky-50 text-sky-700 border-sky-200",
  expired:   "bg-amber-50 text-amber-700 border-amber-200",
  archived:  "bg-slate-100 text-slate-500 border-slate-200",
};

const CATS = ["all", "crop", "market", "disease", "weather", "pest", "irrigation", "general"];

export default function AdvisoryHistory({ onView }) {
  const [category, setCategory] = useState("");
  const [from, setFrom]         = useState("");
  const [to, setTo]             = useState("");
  const [page, setPage]         = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["advisory-history", category, from, to, page],
    queryFn: () => fetchAdvisoryHistory({
      category: category || undefined,
      from:     from     || undefined,
      to:       to       || undefined,
      page,
      limit: 12,
    }),
    staleTime: 60_000,
    keepPreviousData: true,
  });

  const advisories = data?.advisories || [];
  const totalPages = data?.pages || 1;
  const total      = data?.total  || 0;

  const hasFilters = !!(category || from || to);
  const clearAll   = () => { setCategory(""); setFrom(""); setTo(""); setPage(1); };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
        <History size={14} className="text-slate-500 shrink-0" />
        <h2 className="text-sm font-semibold text-slate-900">Advisory History</h2>
        {!isLoading && (
          <span className="ml-auto text-[11px] text-slate-400">{total.toLocaleString()} records</span>
        )}
      </div>

      {/* Filters */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 space-y-3">
        {/* Category chips */}
        <div className="flex flex-wrap gap-1.5">
          {CATS.map(c => {
            const active = category === c || (!category && c === "all");
            return (
              <button
                key={c}
                onClick={() => { setCategory(c === "all" ? "" : c); setPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium capitalize transition border ${
                  active
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>

        {/* Date range */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="text-[10px] font-medium text-slate-400 block mb-1">From</label>
            <div className="relative">
              <CalendarDays size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={from}
                onChange={e => { setFrom(e.target.value); setPage(1); }}
                className="w-full bg-white border border-slate-200 text-slate-700 rounded-lg pl-7 pr-2 py-1.5 text-xs outline-none focus:border-emerald-400 transition"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-medium text-slate-400 block mb-1">To</label>
            <div className="relative">
              <CalendarDays size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={to}
                onChange={e => { setTo(e.target.value); setPage(1); }}
                className="w-full bg-white border border-slate-200 text-slate-700 rounded-lg pl-7 pr-2 py-1.5 text-xs outline-none focus:border-emerald-400 transition"
              />
            </div>
          </div>
          {hasFilters && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-slate-500 border border-slate-200 bg-white hover:bg-slate-50 transition shrink-0"
            >
              <X size={11} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-slate-50">
        {isLoading ? (
          <div className="flex items-center justify-center py-14">
            <Loader2 size={22} className="animate-spin text-slate-400" />
          </div>
        ) : advisories.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-slate-400 text-sm">No history found</p>
            {hasFilters && (
              <button onClick={clearAll} className="mt-2 text-xs text-emerald-600 hover:underline">Clear filters</button>
            )}
          </div>
        ) : (
          advisories.map((a, i) => (
            <motion.div
              key={a._id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.025 }}
              className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize border ${STATUS_STYLE[a.status] || STATUS_STYLE.archived}`}>
                    {a.status}
                  </span>
                  <span className="text-[10px] text-slate-400 capitalize">{a.category}</span>
                </div>
                <p className="text-sm font-medium text-slate-800 truncate">{a.title}</p>
                <div className="flex items-center gap-3 mt-0.5 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1"><Eye size={9} />{(a.views || 0).toLocaleString()}</span>
                  <span>{(a.reach || 0).toLocaleString()} reach</span>
                  {a.publishedAt && (
                    <span>{new Date(a.publishedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => onView?.(a)}
                className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition shrink-0"
              >
                <Eye size={13} />
              </button>
            </motion.div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
          <p className="text-[11px] text-slate-400">Page {page} of {totalPages}</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-30 transition"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-30 transition"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
