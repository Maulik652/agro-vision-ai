import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, RefreshCw, ThumbsUp, Radio } from "lucide-react";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { fetchCropReviews, submitCropReview } from "../../../api/cropDetailApi";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

const StarRating = ({ value, onChange, size = 18 }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((s) => (
      <button key={s} type="button" onClick={() => onChange?.(s)}>
        <Star size={size}
          className={s <= value ? "text-amber-400 fill-amber-400" : "text-slate-300 hover:text-amber-300 transition-colors"} />
      </button>
    ))}
  </div>
);

const avgRating = (reviews) => {
  if (!reviews.length) return 0;
  return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
};

export default function ReviewSection({ cropId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  const load = () => {
    setLoading(true);
    fetchCropReviews(cropId)
      .then((data) => setReviews(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (cropId) load(); }, [cropId]);

  // Real-time: listen for new crop reviews via the crop room
  useEffect(() => {
    if (!cropId) return;
    const token = localStorage.getItem("token");
    const socket = io(SOCKET_URL, { auth: { token }, transports: ["websocket", "polling"] });
    socketRef.current = socket;
    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("join_crop_room", { cropId });
    });
    socket.on("disconnect", () => setIsConnected(false));

    // When any buyer submits a review for this crop, reload
    socket.on("crop_review_added", ({ cropId: cid }) => {
      if (String(cid) === String(cropId)) load();
    });

    return () => {
      socket.emit("leave_crop_room", { cropId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [cropId]);

  const handleSubmit = async () => {
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      await submitCropReview(cropId, { rating, comment });
      toast.success("Review submitted");
      setComment("");
      setRating(5);
      load();
    } catch {
      toast.error("Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const avg = avgRating(reviews);

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-slate-800 font-semibold text-sm flex items-center gap-2">
          <Star size={15} className="text-amber-400" /> Buyer Reviews
          <span className="text-slate-400 font-normal">({reviews.length})</span>
          <Radio size={9} className={isConnected ? "text-emerald-500 animate-pulse" : "text-slate-300"} />
        </h3>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2">
            <StarRating value={Math.round(avg)} size={13} />
            <span className="text-amber-500 font-bold text-sm">{avg.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Rating distribution */}
      {reviews.length > 0 && (
        <div className="mb-5 space-y-1.5">
          {[5, 4, 3, 2, 1].map((s) => {
            const count = reviews.filter((r) => r.rating === s).length;
            const pct = reviews.length ? (count / reviews.length) * 100 : 0;
            return (
              <div key={s} className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 w-3">{s}</span>
                <Star size={10} className="text-amber-400 fill-amber-400 shrink-0" />
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full bg-amber-400 rounded-full" />
                </div>
                <span className="text-slate-400 w-5 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Write review */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5">
        <p className="text-slate-500 text-xs mb-3">Share your experience</p>
        <StarRating value={rating} onChange={setRating} />
        <textarea value={comment} onChange={(e) => setComment(e.target.value)}
          placeholder="How was the crop quality, delivery, and farmer communication?"
          rows={3}
          className="w-full bg-transparent text-slate-700 text-sm placeholder-slate-400 focus:outline-none resize-none mt-3 mb-3" />
        <button onClick={handleSubmit} disabled={submitting || !comment.trim()}
          className="px-4 py-2 rounded-xl bg-green-700 text-white text-xs font-semibold disabled:opacity-40 hover:bg-green-800 transition-all flex items-center gap-2">
          {submitting ? <RefreshCw size={12} className="animate-spin" /> : <ThumbsUp size={12} />}
          {submitting ? "Submitting..." : "Submit Review"}
        </button>
      </div>

      {/* Reviews list */}
      {loading ? (
        <div className="flex justify-center py-6">
          <RefreshCw size={18} className="animate-spin text-slate-300" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-6">No reviews yet. Be the first to review!</p>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {reviews.map((r, i) => (
              <motion.div key={r._id ?? i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-green-700 text-xs font-bold shrink-0">
                    {(r.buyer?.name ?? r.buyerName ?? "B")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-slate-700 text-sm font-medium">{r.buyer?.name ?? r.buyerName ?? "Buyer"}</span>
                      <div className="flex items-center gap-1">
                        {[1,2,3,4,5].map((s) => (
                          <Star key={s} size={11}
                            className={s <= r.rating ? "text-amber-400 fill-amber-400" : "text-slate-200"} />
                        ))}
                      </div>
                    </div>
                    {(r.reviewText ?? r.comment) && (
                      <p className="text-slate-500 text-sm leading-relaxed">{r.reviewText ?? r.comment}</p>
                    )}
                    {r.createdAt && (
                      <p className="text-slate-400 text-xs mt-1.5">
                        {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
