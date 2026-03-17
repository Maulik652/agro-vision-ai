import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, AlertTriangle, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { moderateReview } from "../../api/reviewsApi.js";
import StarRating from "./StarRating.jsx";

const ModerationPanel = ({ data, loading, filters, onFilterChange }) => {
  const reviews = data?.reviews || [];
  const total   = data?.total   || 0;
  const pages   = data?.pages   || 1;
  const page    = data?.page    || 1;
  const qc = useQueryClient();

  const moderate = useMutation({
    mutationFn: ({ id, status }) => moderateReview(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["moderation-queue"] });
      qc.invalidateQueries({ queryKey: ["reviews-feed"] });
    },
  });

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center gap-3">
        <AlertTriangle size={15} className="text-amber-600" />
        <h3 className="text-sm font-semibold text-slate-800">Moderation Queue</h3>
        <span className="ml-auto text-xs text-slate-400">{total} items</span>
      </div>

      <div className="divide-y divide-slate-50">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4"><div className="h-16 bg-slate-50 rounded-xl animate-pulse" /></div>
          ))
        ) : reviews.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle size={32} className="text-emerald-400 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Queue is clear</p>
          </div>
        ) : reviews.map(r => (
          <div key={r._id} className="p-4 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-semibold text-slate-800">{r.reviewer?.name || "—"}</span>
                <span className="text-[10px] text-slate-400 capitalize bg-slate-100 px-2 py-0.5 rounded-full">{r.reviewer?.role}</span>
                <StarRating rating={r.rating} size={11} />
                {r.spamScore >= 0.5 && (
                  <span className="text-[10px] text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                    Spam {(r.spamScore * 100).toFixed(0)}%
                  </span>
                )}
                {r.reportCount > 0 && (
                  <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    {r.reportCount} reports
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 line-clamp-2">{r.comment || "(no comment)"}</p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={() => moderate.mutate({ id: r._id, status: "active" })}
                disabled={moderate.isPending}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors disabled:opacity-50">
                {moderate.isPending ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle size={11} />}
                Approve
              </button>
              <button
                onClick={() => moderate.mutate({ id: r._id, status: "removed" })}
                disabled={moderate.isPending}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors disabled:opacity-50">
                <XCircle size={11} />
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

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

export default ModerationPanel;
