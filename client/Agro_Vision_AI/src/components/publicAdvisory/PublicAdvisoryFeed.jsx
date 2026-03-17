import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BookOpen, Search, Filter, ChevronLeft, ChevronRight, Loader2, Inbox } from "lucide-react";
import { fetchPublicAdvisories } from "../../api/publicAdvisoryApi.js";
import AdvisoryCard from "./AdvisoryCard.jsx";
import AdvisoryDetailModal from "./AdvisoryDetailModal.jsx";

const CATEGORIES = ["all", "crop", "market", "disease", "weather", "pest", "irrigation", "general"];

const PublicAdvisoryFeed = ({ role = "farmer" }) => {
  const [category, setCategory] = useState("");
  const [search, setSearch]     = useState("");
  const [page, setPage]         = useState(1);
  const [viewId, setViewId]     = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["pub-advisories", category, page],
    queryFn: () => fetchPublicAdvisories({ category: category || undefined, page, limit: 12 }),
    staleTime: 60_000
  });

  const advisories = data?.advisories || [];
  const totalPages = data?.pages || 1;

  const filtered = search
    ? advisories.filter(a =>
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.summary?.toLowerCase().includes(search.toLowerCase()) ||
        a.category.includes(search.toLowerCase())
      )
    : advisories;

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search advisories..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-emerald-400 transition"
            />
          </div>
          <Filter size={14} className="text-slate-400 shrink-0" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => { setCategory(c === "all" ? "" : c); setPage(1); }}
              className={`px-3 py-1 rounded-lg text-[11px] font-medium capitalize transition ${
                (category === c || (!category && c === "all"))
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-emerald-500" />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Inbox size={40} className="mb-3 opacity-40" />
          <p className="text-sm font-medium">No advisories available</p>
          <p className="text-xs mt-1">Experts haven't published any advisories yet</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((a, i) => (
            <AdvisoryCard key={a._id} advisory={a} index={i} onClick={a => setViewId(a._id)} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-5 py-3 shadow-sm">
          <p className="text-xs text-slate-400">Page {page} of {totalPages} · {data?.total || 0} advisories</p>
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

      <AdvisoryDetailModal advisoryId={viewId} open={!!viewId} onClose={() => setViewId(null)} />
    </div>
  );
};

export default PublicAdvisoryFeed;
