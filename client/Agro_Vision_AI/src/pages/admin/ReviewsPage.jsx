import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Star, Trash2, Flag, CheckCircle } from "lucide-react";
import { fetchAdminReviews, updateReviewStatus } from "../../api/adminApi";
import toast from "react-hot-toast";

export default function ReviewsPage() {
  const qc = useQueryClient();
  const [flagged, setFlagged] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reviews", { flagged, page }],
    queryFn: () => fetchAdminReviews({ flagged: flagged ? "true" : "", page, limit: 20 }),
  });

  const actionMut = useMutation({
    mutationFn: ({ id, action }) => updateReviewStatus(id, action),
    onSuccess: () => { qc.invalidateQueries(["admin-reviews"]); toast.success("Review updated"); },
    onError: () => toast.error("Failed"),
  });

  const reviews = data?.data || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
          Trust & Review System
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">{total} total reviews</p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => { setFlagged(false); setPage(1); }}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${!flagged ? "bg-green-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
        >
          All Reviews
        </button>
        <button
          onClick={() => { setFlagged(true); setPage(1); }}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${flagged ? "bg-red-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
        >
          Flagged Only
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
            ))
          : reviews.map((r, i) => (
              <motion.div
                key={r._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-2xl bg-white border shadow-sm p-4 ${r.flagged ? "border-red-200" : "border-slate-100"}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{r.reviewer?.name || "Anonymous"}</p>
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star key={j} size={11} className={j < (r.rating || 0) ? "text-amber-400 fill-amber-400" : "text-slate-200"} />
                      ))}
                    </div>
                  </div>
                  {r.flagged && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">Flagged</span>
                  )}
                </div>
                <p className="text-sm text-slate-600 mb-3 line-clamp-2">{r.comment || r.review || "No comment"}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => actionMut.mutate({ id: r._id, action: "approve" })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition"
                  >
                    <CheckCircle size={11} /> Approve
                  </button>
                  <button
                    onClick={() => actionMut.mutate({ id: r._id, action: "flag" })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100 transition"
                  >
                    <Flag size={11} /> Flag
                  </button>
                  <button
                    onClick={() => actionMut.mutate({ id: r._id, action: "remove" })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition"
                  >
                    <Trash2 size={11} /> Remove
                  </button>
                </div>
              </motion.div>
            ))}
        {!isLoading && reviews.length === 0 && (
          <div className="col-span-2 text-center py-12 text-slate-400 text-sm">No reviews found</div>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center gap-2 justify-center">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-4 py-2 text-sm rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Prev</button>
          <span className="text-sm text-slate-500">Page {page} of {pages}</span>
          <button disabled={page === pages} onClick={() => setPage((p) => p + 1)} className="px-4 py-2 text-sm rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Next</button>
        </div>
      )}
    </div>
  );
}
