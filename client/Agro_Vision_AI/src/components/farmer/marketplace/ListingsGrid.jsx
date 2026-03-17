import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Plus, Loader2, RefreshCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyListings } from "../../../api/marketplaceApi";
import ListingCard from "./ListingCard";

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

export default function ListingsGrid({ filters = {}, onAddNew, onListingChanged }) {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const params = {
    page,
    limit: 9,
    search: filters.search || undefined,
    category: filters.category !== "All" ? filters.category : undefined,
    status: filters.status !== "all" ? filters.status : undefined,
    sortBy: filters.sortBy || "newest",
  };

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ["farmerListings", params],
    queryFn: () => getMyListings(params),
    staleTime: 30000,
    keepPreviousData: true,
  });

  const listings = data?.listings || data?.data || [];
  const total = data?.total || 0;
  const pages = data?.pages || Math.ceil(total / 9) || 1;

  const handleChanged = () => {
    qc.invalidateQueries({ queryKey: ["farmerListings"] });
    onListingChanged?.();
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white">
            <div className="h-40 rounded-t-2xl bg-slate-200" />
            <div className="p-4 space-y-2">
              <div className="h-4 w-3/4 rounded bg-slate-200" />
              <div className="h-3 w-1/2 rounded bg-slate-200" />
              <div className="h-3 w-2/3 rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 py-16">
        <p className="text-sm font-bold text-rose-700">Failed to load listings</p>
        <button onClick={() => qc.invalidateQueries({ queryKey: ["farmerListings"] })} className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition">
          <RefreshCcw size={12} /> Retry
        </button>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-20">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100"><Package size={28} className="text-emerald-600" /></div>
        <div className="text-center">
          <p className="text-base font-black text-slate-700">No listings yet</p>
          <p className="mt-1 text-sm text-slate-500">Start selling by listing your first crop</p>
        </div>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onAddNew} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition">
          <Plus size={15} /> Go to Sell Crop
        </motion.button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-600">{total} listing{total !== 1 ? "s" : ""} {isFetching && <Loader2 size={12} className="inline animate-spin ml-1 text-slate-400" />}</p>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onAddNew} className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition">
          <Plus size={13} /> Sell Crop
        </motion.button>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="visible" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {listings.map((l) => <ListingCard key={l._id} listing={l} onChanged={handleChanged} />)}
        </AnimatePresence>
      </motion.div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition">
            <ChevronLeft size={14} />
          </button>
          {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)} className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition ${page === p ? "bg-emerald-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{p}</button>
          ))}
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition">
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
