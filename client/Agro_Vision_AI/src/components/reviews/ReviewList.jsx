import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ReviewCard from "./ReviewCard.jsx";

const SORTS  = [{ v: "latest", l: "Latest" }, { v: "highest", l: "Highest" }, { v: "lowest", l: "Lowest" }];
const ROLES  = ["", "farmer", "buyer", "expert"];

const ReviewList = ({ data, loading, filters, onFilterChange, showModeration = false }) => {
  const reviews = data?.reviews || [];
  const total   = data?.total   || 0;
  const pages   = data?.pages   || 1;
  const page    = data?.page    || 1;

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
      {/* Filter bar */}
      <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
        <h3 className="text-sm font-semibold text-slate-800 mr-auto">Reviews <span className="text-slate-400 font-normal">({total})</span></h3>

        <div className="flex gap-1">
          {SORTS.map(s => (
            <button key={s.v} onClick={() => onFilterChange({ sort: s.v, page: 1 })}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                (filters.sort || "latest") === s.v ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}>
              {s.l}
            </button>
          ))}
        </div>

        <select value={filters.role || ""} onChange={e => onFilterChange({ role: e.target.value, page: 1 })}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400">
          {ROLES.map(r => <option key={r} value={r}>{r ? r.charAt(0).toUpperCase() + r.slice(1) : "All Roles"}</option>)}
        </select>
      </div>

      {/* List */}
      <div className="p-4 space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-50 rounded-2xl animate-pulse" />
          ))
        ) : reviews.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-10">No reviews found</p>
        ) : reviews.map(r => (
          <ReviewCard key={r._id} review={r} showModeration={showModeration} />
        ))}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">Page {page} of {pages}</span>
          <div className="flex gap-1">
            <button onClick={() => onFilterChange({ page: page - 1 })} disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors">
              <ChevronLeft size={13} />
            </button>
            <button onClick={() => onFilterChange({ page: page + 1 })} disabled={page >= pages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors">
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewList;
