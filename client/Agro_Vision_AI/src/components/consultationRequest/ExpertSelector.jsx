import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Search, SlidersHorizontal, Star, MapPin, Clock,
  CheckCircle2, Zap, BadgeCheck, X,
} from "lucide-react";

const SPECIALIZATIONS = [
  "All", "Crop Disease", "Soil Health", "Irrigation", "Pest Control",
  "Organic Farming", "Market Advisory", "Horticulture", "Agronomy",
];

const SORT_OPTIONS = [
  { value: "rating",   label: "Top Rated" },
  { value: "fee_low",  label: "Fee: Low → High" },
  { value: "fee_high", label: "Fee: High → Low" },
];

export default function ExpertSelector({ experts = [], selectedId, onSelect, autoAssign, onToggleAuto }) {
  const [search, setSearch]         = useState("");
  const [spec, setSpec]             = useState("All");
  const [sortBy, setSortBy]         = useState("rating");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let list = [...experts];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.name?.toLowerCase().includes(q) ||
        e.specialization?.toLowerCase().includes(q) ||
        e.city?.toLowerCase().includes(q)
      );
    }

    if (spec !== "All") {
      list = list.filter(e =>
        e.specialization?.toLowerCase().includes(spec.toLowerCase())
      );
    }

    if (sortBy === "rating")   list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (sortBy === "fee_low")  list.sort((a, b) => (a.consultationFee || 0) - (b.consultationFee || 0));
    if (sortBy === "fee_high") list.sort((a, b) => (b.consultationFee || 0) - (a.consultationFee || 0));

    return list;
  }, [experts, search, spec, sortBy]);

  const selectedExpert = experts.find(e => e._id === selectedId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
          <Users size={18} className="text-amber-600" />
        </div>
        <div>
          <h2 className="text-slate-900 font-semibold text-lg" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
            Select Expert
          </h2>
          <p className="text-slate-500 text-xs">
            {experts.length} expert{experts.length !== 1 ? "s" : ""} available · Choose manually or let AI assign
          </p>
        </div>
      </div>

      {/* Auto-assign toggle */}
      <button
        type="button"
        onClick={onToggleAuto}
        className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${
          autoAssign
            ? "bg-emerald-50 border-emerald-300 text-emerald-700"
            : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
        }`}
      >
        <Zap size={16} className={autoAssign ? "text-emerald-500" : "text-slate-400"} />
        <div className="text-left flex-1">
          <p className="font-semibold text-sm">Auto-assign Best Expert</p>
          <p className="text-xs opacity-70 mt-0.5">AI picks the most suitable expert for your crop issue</p>
        </div>
        {autoAssign && <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />}
      </button>

      {/* Manual selection panel */}
      <AnimatePresence>
        {!autoAssign && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden space-y-3"
          >
            {/* Search + filter toggle */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, specialization, city..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:bg-white transition"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowFilters(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition ${
                  showFilters
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <SlidersHorizontal size={13} /> Filters
              </button>
            </div>

            {/* Filter panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden space-y-3 bg-slate-50 rounded-xl p-3 border border-slate-100"
                >
                  {/* Specialization chips */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Specialization</p>
                    <div className="flex flex-wrap gap-1.5">
                      {SPECIALIZATIONS.map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSpec(s)}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                            spec === s
                              ? "bg-emerald-600 text-white"
                              : "bg-white border border-slate-200 text-slate-600 hover:border-emerald-300"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sort */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Sort By</p>
                    <div className="flex gap-2">
                      {SORT_OPTIONS.map(o => (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => setSortBy(o.value)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            sortBy === o.value
                              ? "bg-emerald-600 text-white"
                              : "bg-white border border-slate-200 text-slate-600 hover:border-emerald-300"
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results count + clear */}
            <p className="text-xs text-slate-400 flex items-center gap-1">
              {filtered.length} expert{filtered.length !== 1 ? "s" : ""} found
              {(search || spec !== "All") && (
                <button
                  type="button"
                  onClick={() => { setSearch(""); setSpec("All"); }}
                  className="ml-1 flex items-center gap-0.5 text-emerald-600 hover:underline"
                >
                  <X size={11} /> Clear filters
                </button>
              )}
            </p>

            {/* Expert list */}
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <div className="py-8 text-center">
                  <Users size={28} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-400 text-sm">No experts match your search</p>
                </div>
              ) : (
                filtered.map(expert => (
                  <button
                    key={expert._id}
                    type="button"
                    onClick={() => onSelect(expert._id)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
                      selectedId === expert._id
                        ? "bg-emerald-50 border-emerald-300 shadow-sm"
                        : "bg-slate-50 border-slate-100 hover:border-slate-200 hover:bg-white"
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                        {expert.avatar
                          ? <img src={expert.avatar} alt={expert.name} className="w-full h-full object-cover" />
                          : <span className="text-emerald-600 font-bold text-base">{expert.name?.[0]?.toUpperCase()}</span>
                        }
                      </div>
                      {expert.isAvailable && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-slate-800 font-semibold text-sm truncate">{expert.name}</p>
                        {expert.isAvailable && (
                          <span className="shrink-0 text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                            Available
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs truncate">{expert.specialization}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {(expert.city || expert.state) && (
                          <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                            <MapPin size={9} /> {[expert.city, expert.state].filter(Boolean).join(", ")}
                          </span>
                        )}
                        {expert.yearsExperience > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                            <Clock size={9} /> {expert.yearsExperience}y exp
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Rating + fee */}
                    <div className="text-right shrink-0 space-y-0.5">
                      <div className="flex items-center gap-1 justify-end">
                        <Star size={11} className="text-yellow-500 fill-yellow-400" />
                        <span className="text-slate-700 text-xs font-semibold">
                          {expert.rating > 0 ? expert.rating.toFixed(1) : "New"}
                        </span>
                        {expert.reviewCount > 0 && (
                          <span className="text-slate-400 text-[10px]">({expert.reviewCount})</span>
                        )}
                      </div>
                      <p className="text-emerald-600 font-bold text-sm">₹{expert.consultationFee || 500}</p>
                      <p className="text-[9px] text-slate-400">per session</p>
                    </div>

                    {selectedId === expert._id && (
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0 ml-1" />
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Selected expert summary banner */}
            <AnimatePresence>
              {selectedExpert && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200"
                >
                  <BadgeCheck size={16} className="text-emerald-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-emerald-800">
                      Selected: {selectedExpert.name}
                    </p>
                    <p className="text-[10px] text-emerald-600">
                      {selectedExpert.specialization} · ₹{selectedExpert.consultationFee || 500}/session
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelect(null)}
                    className="text-emerald-500 hover:text-emerald-700 transition"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
