import { motion } from "framer-motion";
import { Search, SlidersHorizontal, X } from "lucide-react";

const CATEGORIES = ["All","Wheat","Rice","Maize","Cotton","Soybean","Groundnut","Potato","Tomato","Onion","Sugarcane","Mango","Banana","Grapes","Sunflower","Mustard"];
const STATUSES = [{ value: "all", label: "All Status" }, { value: "active", label: "Active" }, { value: "paused", label: "Paused" }, { value: "sold", label: "Sold" }, { value: "expired", label: "Expired" }];
const SORTS = [{ value: "newest", label: "Newest First" }, { value: "oldest", label: "Oldest First" }, { value: "price_high", label: "Price: High → Low" }, { value: "price_low", label: "Price: Low → High" }, { value: "views", label: "Most Viewed" }];

export default function FilterSidebar({ filters, onChange }) {
  const set = (k, v) => onChange({ ...filters, [k]: v });
  const hasFilters = filters.search || filters.category !== "All" || filters.status !== "all";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={15} className="text-emerald-600" />
          <span className="text-sm font-black text-slate-800">Filters</span>
        </div>
        {hasFilters && (
          <button onClick={() => onChange({ search: "", category: "All", status: "all", sortBy: "newest" })} className="flex items-center gap-1 text-[10px] font-bold text-rose-500 hover:text-rose-700 transition">
            <X size={10} /> Clear
          </button>
        )}
      </div>

      {/* Search */}
      <div>
        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Search</label>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={filters.search} onChange={(e) => set("search", e.target.value)} placeholder="Search crops..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Crop Type</label>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <motion.button key={c} whileTap={{ scale: 0.95 }} onClick={() => set("category", c)} className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition ${filters.category === c ? "bg-emerald-600 text-white" : "border border-slate-200 bg-slate-50 text-slate-600 hover:border-emerald-300 hover:text-emerald-700"}`}>{c}</motion.button>
          ))}
        </div>
      </div>

      {/* Status */}
      <div>
        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</label>
        <div className="space-y-1">
          {STATUSES.map((s) => (
            <button key={s.value} onClick={() => set("status", s.value)} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${filters.status === s.value ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50"}`}>
              <span className={`h-2 w-2 rounded-full ${s.value === "active" ? "bg-emerald-500" : s.value === "paused" ? "bg-amber-500" : s.value === "sold" ? "bg-slate-400" : s.value === "expired" ? "bg-rose-500" : "bg-slate-300"}`} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sort */}
      <div>
        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Sort By</label>
        <select value={filters.sortBy} onChange={(e) => set("sortBy", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100">
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
    </div>
  );
}
