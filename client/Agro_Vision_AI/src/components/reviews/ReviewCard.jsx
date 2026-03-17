import React, { useState } from "react";
import { motion } from "framer-motion";
import { Flag, CheckCircle, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import StarRating from "./StarRating.jsx";
import { reportReview } from "../../api/reviewsApi.js";

const ROLE_COLORS = {
  farmer: "bg-emerald-100 text-emerald-700",
  buyer:  "bg-blue-100 text-blue-700",
  expert: "bg-violet-100 text-violet-700",
};

const SENTIMENT_CONFIG = {
  positive:   { color: "text-emerald-600", bg: "bg-emerald-50", label: "Positive" },
  neutral:    { color: "text-slate-500",   bg: "bg-slate-50",   label: "Neutral"  },
  negative:   { color: "text-red-600",     bg: "bg-red-50",     label: "Negative" },
  unanalyzed: { color: "text-slate-400",   bg: "bg-slate-50",   label: ""         },
};

const ReviewCard = ({ review, showModeration = false }) => {
  const [expanded, setExpanded] = useState(false);
  const [reported, setReported] = useState(false);
  const qc = useQueryClient();

  const report = useMutation({
    mutationFn: () => reportReview(review._id, { reason: "spam", description: "" }),
    onSuccess: () => { setReported(true); qc.invalidateQueries({ queryKey: ["reviews-feed"] }); },
  });

  const sentiment = SENTIMENT_CONFIG[review.sentiment] || SENTIMENT_CONFIG.unanalyzed;
  const isLong = review.comment?.length > 200;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className={`bg-white border rounded-2xl p-4 shadow-sm ${review.status === "flagged" ? "border-amber-200" : "border-slate-200"}`}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-sm font-bold text-emerald-700">
          {review.reviewer?.name?.[0]?.toUpperCase() || "?"}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-800">{review.reviewer?.name || "Anonymous"}</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${ROLE_COLORS[review.reviewer?.role] || "bg-slate-100 text-slate-600"}`}>
              {review.reviewer?.role}
            </span>
            {review.cropName && (
              <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{review.cropName}</span>
            )}
            {review.status === "flagged" && (
              <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                <AlertTriangle size={9} /> Flagged
              </span>
            )}
          </div>

          {/* Rating + date */}
          <div className="flex items-center gap-3 mt-1">
            <StarRating rating={review.rating} size={13} />
            <span className="text-[11px] text-slate-400">{new Date(review.createdAt).toLocaleDateString()}</span>
            {review.sentiment !== "unanalyzed" && (
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${sentiment.bg} ${sentiment.color}`}>
                {sentiment.label}
              </span>
            )}
          </div>

          {/* Comment */}
          {review.comment && (
            <div className="mt-2">
              <p className="text-sm text-slate-600 leading-relaxed">
                {isLong && !expanded ? `${review.comment.slice(0, 200)}…` : review.comment}
              </p>
              {isLong && (
                <button onClick={() => setExpanded(p => !p)}
                  className="flex items-center gap-1 text-xs text-emerald-600 mt-1 hover:text-emerald-700 transition-colors">
                  {expanded ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Read more</>}
                </button>
              )}
            </div>
          )}

          {/* Images */}
          {review.images?.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {review.images.map((img, i) => (
                <img key={i} src={img} alt="" className="w-14 h-14 rounded-lg object-cover border border-slate-200" />
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 mt-2">
            {!reported ? (
              <button onClick={() => report.mutate()} disabled={report.isPending}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-500 transition-colors">
                <Flag size={11} /> Report
              </button>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-emerald-600">
                <CheckCircle size={11} /> Reported
              </span>
            )}
            {showModeration && review.spamScore > 0 && (
              <span className="text-[10px] text-slate-400">Spam: {(review.spamScore * 100).toFixed(0)}%</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ReviewCard;
