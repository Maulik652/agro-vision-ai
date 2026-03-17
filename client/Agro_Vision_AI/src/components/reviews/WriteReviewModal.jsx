import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2, CheckCircle, Brain } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import StarRating from "./StarRating.jsx";
import { createReview, analyzeSentiment } from "../../api/reviewsApi.js";

const WriteReviewModal = ({ open, onClose, targetUserId, transactionId, reviewType = "order", cropName = "" }) => {
  const [rating,    setRating]    = useState(0);
  const [comment,   setComment]   = useState("");
  const [sentiment, setSentiment] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const qc = useQueryClient();

  // Live sentiment analysis with debounce
  useEffect(() => {
    if (comment.length < 15) { setSentiment(null); return; }
    const t = setTimeout(async () => {
      setAnalyzing(true);
      try { setSentiment(await analyzeSentiment(comment)); } catch { /* ignore */ }
      finally { setAnalyzing(false); }
    }, 800);
    return () => clearTimeout(t);
  }, [comment]);

  const submit = useMutation({
    mutationFn: () => createReview({ targetUserId, transactionId, reviewType, rating, comment, cropName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reviews-feed"] });
      qc.invalidateQueries({ queryKey: ["reviews-overview"] });
      qc.invalidateQueries({ queryKey: ["reviews-analytics"] });
      onClose();
    },
  });

  const SENTIMENT_COLORS = { positive: "text-emerald-600 bg-emerald-50 border-emerald-200", neutral: "text-slate-500 bg-slate-50 border-slate-200", negative: "text-red-600 bg-red-50 border-red-200" };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6">

            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-slate-800">Write a Review</h3>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"><X size={16} /></button>
            </div>

            {/* Star rating */}
            <div className="mb-4">
              <label className="text-xs text-slate-500 uppercase tracking-wide block mb-2">Your Rating</label>
              <StarRating rating={rating} size={28} interactive onChange={setRating} />
              {rating > 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  {["","Poor","Fair","Good","Very Good","Excellent"][rating]}
                </p>
              )}
            </div>

            {/* Comment */}
            <div className="mb-3">
              <label className="text-xs text-slate-500 uppercase tracking-wide block mb-2">Your Review</label>
              <textarea value={comment} onChange={e => setComment(e.target.value)} rows={4}
                placeholder="Share your experience in detail..."
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
              <div className="flex items-center justify-between mt-1">
                <span className="text-[11px] text-slate-400">{comment.length}/2000</span>
                {analyzing && <span className="flex items-center gap-1 text-[11px] text-slate-400"><Brain size={10} className="animate-pulse" /> Analyzing…</span>}
              </div>
            </div>

            {/* Sentiment badge */}
            {sentiment && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl border mb-4 ${SENTIMENT_COLORS[sentiment.sentiment]}`}>
                <Brain size={12} />
                AI Sentiment: {sentiment.sentiment} ({Math.round(sentiment.confidence * 100)}% confidence)
              </motion.div>
            )}

            {submit.isError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                {submit.error?.response?.data?.message || "Failed to submit review"}
              </p>
            )}

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button onClick={() => submit.mutate()} disabled={rating === 0 || submit.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                {submit.isPending ? <Loader2 size={14} className="animate-spin" /> : submit.isSuccess ? <CheckCircle size={14} /> : <Send size={14} />}
                {submit.isPending ? "Submitting…" : "Submit Review"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default WriteReviewModal;
