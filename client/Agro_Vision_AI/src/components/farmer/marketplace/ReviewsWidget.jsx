import { motion } from "framer-motion";
import { Star, MessageSquare, TrendingUp, Loader2, Radio } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { getMarketReviews } from "../../../api/farmerMarketplaceApi";
import toast from "react-hot-toast";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

const StarRow = ({ rating }) => (
  <div className="flex gap-0.5">
    {[1,2,3,4,5].map((s) => (
      <Star key={s} size={11} className={s <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200"} />
    ))}
  </div>
);

export default function ReviewsWidget({ compact = false }) {
  const qc = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  const { data, isLoading } = useQuery({
    queryKey: ["farmerReviews"],
    queryFn: getMarketReviews,
    staleTime: 120000,
    retry: 1,
  });

  // Real-time: listen for new reviews on this farmer's profile
  useEffect(() => {
    const token = localStorage.getItem("token");
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;
    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));

    socket.on("new_review", ({ rating, sentiment }) => {
      qc.invalidateQueries({ queryKey: ["farmerReviews"] });
      toast(`New ${sentiment || ""} review — ${rating}★`, { icon: "⭐", duration: 4000 });
    });

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [qc]);

  const reviews = data?.reviews || data || [];
  const avgRating = data?.avgRating || 0;
  const total = data?.total || reviews.length;

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-xl bg-slate-200 animate-pulse" />
          <div className="h-4 w-24 rounded bg-slate-200 animate-pulse" />
        </div>
        {[1,2].map((i) => <div key={i} className="mb-3 h-20 rounded-xl bg-slate-100 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${compact ? "p-4" : "p-6"}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100"><Star size={15} className="text-amber-600" /></div>
        <div>
          <h3 className="text-sm font-black text-slate-800">Reviews</h3>
          <p className="text-[10px] text-slate-500">{total} review{total !== 1 ? "s" : ""}</p>
        </div>
        {avgRating > 0 && (
          <div className="ml-auto flex items-center gap-1.5">
            <Radio size={9} className={isConnected ? "text-emerald-500 animate-pulse" : "text-slate-300"} />
            <Star size={14} className="fill-amber-400 text-amber-400" />
            <span className="text-sm font-black text-amber-700">{avgRating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <Star size={24} className="text-slate-300" />
          <p className="text-sm font-semibold text-slate-500">No reviews yet</p>
          <p className="text-xs text-slate-400">Buyers will leave reviews after purchases</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.slice(0, compact ? 3 : 10).map((r) => (
            <motion.div key={r._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700">
                    {(r.reviewer?.name || "U").charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-slate-700">{r.reviewer?.name || "Buyer"}</span>
                </div>
                <StarRow rating={r.rating || 0} />
              </div>
              {r.comment && <p className="text-[11px] text-slate-600 italic">"{r.comment}"</p>}
              <p className="mt-1 text-[9px] text-slate-400">{new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
