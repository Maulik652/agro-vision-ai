import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HandCoins, CheckCircle, XCircle, Clock, User, Package, Loader2, ChevronRight, MessageSquare, ArrowRight } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getBuyerRequests } from "../../../api/farmerMarketplaceApi";
import { respondToOffer } from "../../../api/marketplaceApi";

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  accepted: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-100 text-rose-700 border-rose-200",
  negotiating: "bg-blue-100 text-blue-700 border-blue-200",
  expired: "bg-slate-100 text-slate-500 border-slate-200",
};

function OfferCard({ offer, onRespond }) {
  const [showCounter, setShowCounter] = useState(false);
  const [counterPrice, setCounterPrice] = useState("");
  const [counterMsg, setCounterMsg] = useState("");

  const { mutate: respond, isPending } = useMutation({
    mutationFn: ({ action, data }) => respondToOffer(offer._id, { action, ...data }),
    onSuccess: (_, vars) => {
      toast.success(vars.action === "accept" ? "Offer accepted!" : vars.action === "reject" ? "Offer rejected" : "Counter offer sent");
      onRespond?.();
      setShowCounter(false);
    },
    onError: (e) => toast.error(e?.response?.data?.message || "Action failed"),
  });

  const isPending_ = offer.status === "pending";
  const crop = offer.cropListing;

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700">
            {(offer.buyerName || offer.buyer?.name || "B").charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">{offer.buyerName || offer.buyer?.name || "Buyer"}</p>
            <p className="text-[10px] text-slate-500">{new Date(offer.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
          </div>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${STATUS_STYLES[offer.status] || STATUS_STYLES.pending}`}>{offer.status}</span>
      </div>

      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <Package size={11} className="text-slate-400" />
          <span className="font-semibold">{crop?.cropName || "Crop"}</span>
          <span className="text-slate-400">·</span>
          <span>{offer.quantity} {offer.quantityUnit}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-emerald-700">₹{offer.offerPrice?.toLocaleString("en-IN")}</span>
          <span className="text-[10px] text-slate-400">per {offer.quantityUnit}</span>
          {crop?.price && (
            <span className={`text-[10px] font-semibold ${offer.offerPrice >= crop.price ? "text-emerald-600" : "text-rose-600"}`}>
              ({offer.offerPrice >= crop.price ? "+" : ""}{Math.round(((offer.offerPrice - crop.price) / crop.price) * 100)}% vs listed)
            </span>
          )}
        </div>
        {offer.message && <p className="text-[11px] text-slate-500 italic">"{offer.message}"</p>}
      </div>

      {isPending_ && (
        <AnimatePresence mode="wait">
          {!showCounter ? (
            <motion.div key="actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
              <button onClick={() => respond({ action: "accept" })} disabled={isPending} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition disabled:opacity-60">
                {isPending ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />} Accept
              </button>
              <button onClick={() => setShowCounter(true)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition">
                <MessageSquare size={11} /> Counter
              </button>
              <button onClick={() => respond({ action: "reject" })} disabled={isPending} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition disabled:opacity-60">
                <XCircle size={11} /> Reject
              </button>
            </motion.div>
          ) : (
            <motion.div key="counter" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
              <input type="number" value={counterPrice} onChange={(e) => setCounterPrice(e.target.value)} placeholder="Your counter price (₹)" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none" />
              <input value={counterMsg} onChange={(e) => setCounterMsg(e.target.value)} placeholder="Message (optional)" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none" />
              <div className="flex gap-2">
                <button onClick={() => setShowCounter(false)} className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
                <button onClick={() => respond({ action: "counter", data: { counterPrice: Number(counterPrice), counterMessage: counterMsg } })} disabled={!counterPrice || isPending} className="flex-1 rounded-xl bg-blue-600 py-2 text-xs font-bold text-white hover:bg-blue-700 transition disabled:opacity-60">
                  {isPending ? "Sending..." : "Send Counter"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
}

export default function BuyerRequestsPanel({ compact = false, onTabSwitch }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["farmerOffers"],
    queryFn: getBuyerRequests,
    staleTime: 30000,
    retry: 1,
  });

  const offers = data?.requests || data || [];
  const pending = offers.filter((o) => o.status === "pending");

  const handleRespond = () => {
    qc.invalidateQueries({ queryKey: ["farmerOffers"] });
    qc.invalidateQueries({ queryKey: ["farmerMarketSummary"] });
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-xl bg-slate-200 animate-pulse" />
          <div className="h-4 w-32 rounded bg-slate-200 animate-pulse" />
        </div>
        {[1,2].map((i) => <div key={i} className="mb-3 h-24 rounded-xl bg-slate-100 animate-pulse" />)}
      </div>
    );
  }

  const displayOffers = compact ? pending.slice(0, 3) : offers;

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${compact ? "p-4" : "p-6"}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100"><HandCoins size={15} className="text-amber-600" /></div>
          <div>
            <h3 className="text-sm font-black text-slate-800">Buyer Offers</h3>
            <p className="text-[10px] text-slate-500">{pending.length} pending response{pending.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        {compact && onTabSwitch && (
          <button onClick={onTabSwitch} className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition">
            View all <ChevronRight size={12} />
          </button>
        )}
      </div>

      {displayOffers.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <HandCoins size={24} className="text-slate-300" />
          <p className="text-sm font-semibold text-slate-500">No offers yet</p>
          <p className="text-xs text-slate-400">Buyers will send offers on your listings</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayOffers.map((offer) => <OfferCard key={offer._id} offer={offer} onRespond={handleRespond} />)}
        </div>
      )}
    </div>
  );
}
