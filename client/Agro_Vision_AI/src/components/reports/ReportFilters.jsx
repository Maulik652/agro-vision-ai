import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Filter, X } from "lucide-react";
import { debounce } from "../../utils/debounce.js";

const GUJARAT_CITIES = ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar", "Bhavnagar", "Jamnagar", "Junagadh", "Anand", "Mehsana"];
const CROPS = ["Wheat", "Rice", "Cotton", "Groundnut", "Bajra", "Maize", "Sugarcane", "Tomato", "Onion", "Potato"];

const ReportFilters = ({ filters, onChange }) => {
  const [local, setLocal] = useState(filters);

  const debouncedChange = useCallback(debounce((f) => onChange(f), 500), [onChange]);

  useEffect(() => { debouncedChange(local); }, [local]);

  const set = (key, val) => setLocal(prev => ({ ...prev, [key]: val }));
  const reset = () => { const empty = { from: "", to: "", crop: "", region: "" }; setLocal(empty); onChange(empty); };
  const hasFilters = Object.values(local).some(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 shadow-sm rounded-xl p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Filter size={16} className="text-emerald-600" />
        <span className="text-sm font-semibold text-slate-700">Filters</span>
        {hasFilters && (
          <button onClick={reset} className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 transition-colors">
            <X size={12} /> Clear
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">From</label>
          <input type="date" value={local.from || ""} onChange={e => set("from", e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">To</label>
          <input type="date" value={local.to || ""} onChange={e => set("to", e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Crop</label>
          <select value={local.crop || ""} onChange={e => set("crop", e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400">
            <option value="">All Crops</option>
            {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Region (Gujarat)</label>
          <select value={local.region || ""} onChange={e => set("region", e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400">
            <option value="">All Regions</option>
            {GUJARAT_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
    </motion.div>
  );
};

export default ReportFilters;
