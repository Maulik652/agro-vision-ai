/**
 * AnalyticsFilters — time range + optional crop type filter
 */
import { motion } from "framer-motion";
import { Filter } from "lucide-react";

const RANGES = [
  { value: "7d",  label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "6m",  label: "6 Months" },
  { value: "1y",  label: "1 Year" },
];

export default function AnalyticsFilters({ range, cropType, onRangeChange, onCropTypeChange }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center gap-3"
    >
      <div className="flex items-center gap-1.5 text-slate-500">
        <Filter size={14} />
        <span className="text-xs font-medium">Filters</span>
      </div>

      {/* Range pills */}
      <div className="flex gap-1.5">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => onRangeChange(r.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              range === r.value
                ? "bg-green-600 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:border-green-400"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Crop type input */}
      <input
        type="text"
        placeholder="Filter by crop..."
        value={cropType}
        onChange={(e) => onCropTypeChange(e.target.value)}
        className="px-3 py-1.5 rounded-full border border-slate-200 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-green-400 bg-white w-36"
      />
    </motion.div>
  );
}
