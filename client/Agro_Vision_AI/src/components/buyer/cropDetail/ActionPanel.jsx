import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Zap, MessageCircle, Tag, RefreshCw, BarChart2, Send, Clock, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { getAINegotiationSuggestion, submitOffer } from "../../../api/marketplaceApi";
import useOfferSocket from "../../../hooks/useOfferSocket";

const UNIT_MIN_ORDER = { kg: 10, quintal: 1, ton: 1 };
const UNIT_STEP      = { kg: 10, quintal: 1, ton: 1 };
const UNIT_BUYER_HINT = {
  kg:      "Retail / local vendor",
  quintal: "Wholesale trader (1 qtl = 100 kg)",
  ton:     "Bulk buyer (1 ton = 1000 kg)",
};

export default function ActionPanel({ crop, onAddToCart, onBuyNow, onChat, addingCart, buyingNow }) {
  const navigate = useNavigate();
  const unit    = crop?.quantityUnit ?? "kg";
  const minQty  = Math.max(UNIT_MIN_ORDER[unit] ?? 1, crop?.minOrderQty ?? 1);
  const maxQty  = crop?.quantity ?? Infinity;
  const step    = UNIT_STEP[unit] ?? 1;

  const [qty, setQty] = useState(Math.min(minQty, maxQty));
  const [showNegotiate, setShowNegotiate] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [submittingOffer, setSubmittingOffer] = useState(false);

  // Real-time offer response state
  const [offerBanner, setOfferBanner] = useState(null); // { type: "accepted"|"rejected"|"counter", price?, message }
  const [acceptedPrice, setAcceptedPrice] = useState(null); // override displayed price after accept

  const cropListingId = crop?.id || crop?._id;

  useOfferSocket({
    offer_accepted: (payload) => {
      const pid = payload.cropListingId?.toString?.() ?? payload.cropListingId;
      if (pid !== cropListingId?.toString()) return;
      setAcceptedPrice(payload.offerPrice);
      setOfferBanner({ type: "accepted", price: payload.offerPrice, message: payload.message });
      toast.success(`🎉 Your offer of ₹${payload.offerPrice} was accepted!`);
    },
    offer_rejected: (payload) => {
      const pid = payload.cropListingId?.toString?.() ?? payload.cropListingId;
      if (pid !== cropListingId?.toString()) return;
      setOfferBanner({ type: "rejected", message: payload.message });
      toast.error("Your offer was rejected by the farmer.");
    },
    offer_counter: (payload) => {
      const pid = payload.cropListingId?.toString?.() ?? payload.cropListingId;
      if (pid !== cropListingId?.toString()) return;
      setOfferBanner({ type: "counter", price: payload.counterPrice, message: payload.message });
      toast(`Farmer countered at ₹${payload.counterPrice}`, { icon: "🔄" });
    },
  });

  if (!crop) return null;

  const outOfStock = crop.quantity <= 0 || crop.status === "sold";
  const displayPrice = acceptedPrice ?? crop.price;
  const total = displayPrice * qty;
  const demand = crop.aiSellReadiness ?? 60;
  const demandColor = demand >= 70 ? "text-emerald-700" : demand >= 45 ? "text-amber-600" : "text-red-600";
  const demandBg = demand >= 70 ? "bg-emerald-500" : demand >= 45 ? "bg-amber-500" : "bg-red-400";

  const handleAI = async () => {
    if (!offerPrice || isNaN(Number(offerPrice))) return;
    setAiLoading(true);
    try {
      const data = await getAINegotiationSuggestion({
        crop: crop.cropName, farmerPrice: crop.price,
        buyerOffer: Number(offerPrice), location: crop.location?.city,
      });
      setAiResult(data);
    } catch { toast.error("AI negotiation unavailable"); }
    finally { setAiLoading(false); }
  };

  const handleSubmitOffer = async () => {
    if (!offerPrice || !crop.farmer?.id) return;
    setSubmittingOffer(true);
    try {
      await submitOffer({
        cropListing: crop.id, farmer: crop.farmer.id,
        offerPrice: Number(offerPrice), quantity: qty,
        quantityUnit: crop.quantityUnit ?? "kg",
        message: aiResult?.insight ?? "",
      });
      toast.success("Offer submitted to farmer");
      setShowNegotiate(false); setOfferPrice(""); setAiResult(null);
      setOfferBanner(null);
    } catch { toast.error("Failed to submit offer"); }
    finally { setSubmittingOffer(false); }
  };

  const prob = aiResult?.acceptance_probability ?? 0;
  const probPct = Math.round(prob * 100);

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Out of stock banner */}
      {outOfStock && (
        <div className="flex items-center gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
          <AlertCircle size={16} className="text-red-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">Out of Stock</p>
            <p className="text-xs text-red-600">This listing is no longer available for purchase.</p>
          </div>
        </div>
      )}

      {/* Offer response banner */}
      <AnimatePresence>
        {offerBanner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 ${
              offerBanner.type === "accepted"
                ? "bg-emerald-50 border-emerald-200"
                : offerBanner.type === "rejected"
                  ? "bg-red-50 border-red-200"
                  : "bg-blue-50 border-blue-200"
            }`}
          >
            {offerBanner.type === "accepted" && <CheckCircle size={16} className="text-emerald-600 shrink-0 mt-0.5" />}
            {offerBanner.type === "rejected" && <XCircle size={16} className="text-red-600 shrink-0 mt-0.5" />}
            {offerBanner.type === "counter" && <RefreshCw size={16} className="text-blue-600 shrink-0 mt-0.5" />}
            <div className="flex-1">
              <p className={`text-sm font-semibold ${
                offerBanner.type === "accepted" ? "text-emerald-800"
                  : offerBanner.type === "rejected" ? "text-red-800"
                    : "text-blue-800"
              }`}>
                {offerBanner.type === "accepted" && `Offer Accepted — ₹${offerBanner.price}/${unit}`}
                {offerBanner.type === "rejected" && "Offer Rejected"}
                {offerBanner.type === "counter" && `Counter Offer — ₹${offerBanner.price}/${unit}`}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{offerBanner.message}</p>
            </div>
            <button onClick={() => setOfferBanner(null)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Price */}
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-slate-900">₹{displayPrice}</span>
          <span className="text-slate-400 text-sm">/{crop.quantityUnit ?? "kg"}</span>
          {acceptedPrice && (
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">Offer Price</span>
          )}
        </div>
        {crop.aiSuggestedPrice && (
          <p className="text-green-700 text-xs mt-1 flex items-center gap-1">
            <Zap size={10} /> AI suggests ₹{crop.aiSuggestedPrice} · {crop.aiConfidence}% confidence
          </p>
        )}
      </div>

      {/* Demand */}
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-slate-400 flex items-center gap-1"><BarChart2 size={10} /> Demand</span>
          <span className={`font-semibold ${demandColor}`}>{demand}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${demandBg}`} style={{ width: `${demand}%` }} />
        </div>
      </div>

      {/* Quantity */}
      <div>
        <label className="text-slate-500 text-xs mb-2 block">
          Quantity ({unit})
          <span className="ml-2 text-[10px] text-slate-400">— {UNIT_BUYER_HINT[unit]}</span>
        </label>
        <div className="flex items-center gap-2">
          <button onClick={() => setQty((q) => Math.max(minQty, q - step))}
            className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition-all text-lg font-light">−</button>
          <input type="number" value={qty}
            min={minQty} max={maxQty} step={step}
            onChange={(e) => {
              const v = Math.floor(Number(e.target.value));
              setQty(Math.min(maxQty, Math.max(minQty, v)));
            }}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-center text-sm focus:outline-none focus:border-green-500" />
          <button onClick={() => setQty((q) => Math.min(maxQty, q + step))}
            className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition-all text-lg font-light">+</button>
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-slate-400 px-0.5">
          <span>Min: {minQty} {unit}</span>
          <span className={outOfStock ? "text-red-500 font-medium" : ""}>
            {outOfStock ? "Out of stock" : `Available: ${crop.quantity} ${unit}`}
          </span>
        </div>
      </div>

      {/* Total */}
      <div className="flex justify-between items-center py-3 border-t border-b border-slate-100">
        <span className="text-slate-500 text-sm">Total Amount</span>
        <span className="text-slate-900 font-bold text-xl">₹{total.toLocaleString("en-IN")}</span>
      </div>

      {/* CTAs */}
      <button onClick={() => onAddToCart?.(qty)} disabled={addingCart || outOfStock}
        className="w-full py-3 rounded-xl bg-green-700 hover:bg-green-800 text-white font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm shadow-green-700/20">
        {addingCart ? <RefreshCw size={15} className="animate-spin" /> : <ShoppingCart size={15} />}
        {addingCart ? "Adding..." : outOfStock ? "Out of Stock" : "Add to Cart"}
      </button>

      <button onClick={() => onBuyNow?.(qty)} disabled={buyingNow || outOfStock}
        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm shadow-blue-600/20">
        {buyingNow ? <RefreshCw size={15} className="animate-spin" /> : <Zap size={15} />}
        {buyingNow ? "Processing..." : outOfStock ? "Unavailable" : "Buy Now"}
      </button>

      <button
        onClick={() => navigate(`/buyer/chat${crop?.farmer?.id ? `?farmerId=${crop.farmer.id}` : ""}`)}
        className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold text-sm transition-all flex items-center justify-center gap-2">
        <MessageCircle size={15} /> Chat with Farmer
      </button>

      {crop.negotiable && !outOfStock && (
        <button onClick={() => setShowNegotiate(!showNegotiate)}
          className="w-full py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-semibold text-sm transition-all flex items-center justify-center gap-2">
          <Tag size={14} /> {showNegotiate ? "Hide Negotiation" : "Make Price Offer"}
        </button>
      )}

      {/* Negotiation panel */}
      <AnimatePresence>
        {showNegotiate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="pt-2 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <p className="text-slate-400 text-[10px] mb-1">Farmer Price</p>
                  <p className="text-slate-800 font-bold">₹{crop.price}</p>
                </div>
                <span className="text-slate-300 text-lg">→</span>
                <input type="number" placeholder="Your offer ₹" value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-slate-800 text-center font-bold focus:outline-none focus:border-amber-400 placeholder-slate-300" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleAI} disabled={aiLoading || !offerPrice}
                  className="flex-1 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-xs font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-1.5">
                  {aiLoading ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />} AI Check
                </button>
                <button onClick={handleSubmitOffer} disabled={submittingOffer || !offerPrice}
                  className="flex-1 py-2 rounded-xl bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 text-xs font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-1.5">
                  {submittingOffer ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />} Submit Offer
                </button>
              </div>
              <AnimatePresence>
                {aiResult && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-xs">Recommended</span>
                      <span className="text-amber-700 font-bold">₹{aiResult.recommended_price}</span>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">Acceptance Probability</span>
                        <span className={`font-semibold ${probPct >= 60 ? "text-emerald-700" : probPct >= 35 ? "text-amber-700" : "text-red-600"}`}>{probPct}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${probPct}%` }}
                          className={`h-full rounded-full ${probPct >= 60 ? "bg-emerald-500" : probPct >= 35 ? "bg-amber-500" : "bg-red-400"}`} />
                      </div>
                    </div>
                    {aiResult.insight && <p className="text-slate-500 text-xs italic">{aiResult.insight}</p>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {crop.responseSlaHours && (
        <p className="text-slate-400 text-[10px] text-center flex items-center justify-center gap-1">
          <Clock size={9} /> Farmer responds within {crop.responseSlaHours}h
        </p>
      )}
    </div>
  );
}
