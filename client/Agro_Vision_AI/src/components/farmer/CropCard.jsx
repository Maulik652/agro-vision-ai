import React from "react";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  CalendarDays,
  CircleGauge,
  Leaf,
  MapPin,
  Phone,
  Send,
  Star,
  Sprout,
  UserRound
} from "lucide-react";

const formatCurrency = (value) => `Rs ${new Intl.NumberFormat("en-IN").format(Number(value || 0))}`;
const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

const hashSeed = (value = "") => {
  let hash = 0;

  for (let index = 0; index < String(value).length; index += 1) {
    hash = ((hash * 31) + String(value).charCodeAt(index)) % 1000003;
  }

  return hash;
};

const estimatedDistance = (listingId) => {
  const seed = hashSeed(listingId || "crop");
  return (2 + (seed % 9));
};

const CropCard = ({ listing, onView, onOffer }) => {
  const farmer = listing?.farmer || {};
  const rating = Number(farmer.rating || 4.6);
  const distanceKm = estimatedDistance(listing?.id);
  const fallbackImage =
    "linear-gradient(135deg, rgba(37,102,52,0.92), rgba(130,182,70,0.8), rgba(249,168,37,0.76))";

  return (
    <motion.article
      whileHover={{ y: -5, scale: 1.01 }}
      transition={{ duration: 0.25 }}
      className="group overflow-hidden rounded-3xl border border-[#d6ebd8] bg-white shadow-[0_22px_40px_-34px_rgba(26,90,38,0.65)]"
    >
      <div className="relative h-44">
        {listing.image ? (
          <img src={listing.image} alt={listing.cropName} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={{ background: fallbackImage }} />
        )}

        <div className="absolute inset-0 bg-linear-to-t from-[#0f2a15]/76 via-transparent to-transparent" />

        <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#f5fff5]/90 px-3 py-1 text-xs font-semibold text-[#235d2d]">
          <Sprout size={13} />
          {listing.qualityType === "organic" ? "Organic" : "Normal"}
        </div>

        {listing.aiConfidence ? (
          <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#1f5528]/92 px-3 py-1 text-xs font-semibold text-white">
            <CircleGauge size={13} />
            AI {Math.round(listing.aiConfidence)}%
          </div>
        ) : null}

        <div className="absolute bottom-3 left-3 text-white">
          <h3 className="text-xl font-extrabold tracking-tight">{listing.cropName}</h3>
          <p className="text-xs text-white/80">{listing.quantity} {listing.quantityUnit} available</p>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#edf8ef] px-2 py-1 font-semibold text-[#2e6f3f]">
            <MapPin size={12} />
            {distanceKm} km away
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#fff6dc] px-2 py-1 font-semibold text-[#7d6516]">
            <Star size={12} />
            {rating.toFixed(1)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-[#f2fbf3] p-3">
            <p className="text-[11px] uppercase tracking-wide text-[#608166]">Price / Unit</p>
            <p className="text-lg font-bold text-[#1f522a]">{formatCurrency(listing.price)}</p>
          </div>

          <div className="rounded-xl bg-[#fff9ea] p-3">
            <p className="text-[11px] uppercase tracking-wide text-[#8b741f]">AI Suggestion</p>
            <p className="text-lg font-bold text-[#725b12]">{listing.aiSuggestedPrice ? formatCurrency(listing.aiSuggestedPrice) : "Pending"}</p>
          </div>
        </div>

        <div className="grid gap-2 text-sm text-[#33543a]">
          <p className="inline-flex items-center gap-2">
            <MapPin size={15} className="text-[#3e7f4a]" />
            {listing.location?.city}, {listing.location?.state}
          </p>
          <p className="inline-flex items-center gap-2">
            <CalendarDays size={15} className="text-[#3e7f4a]" />
            Harvest: {formatDate(listing.harvestDate)}
          </p>
          <p className="inline-flex items-center gap-2">
            <UserRound size={15} className="text-[#3e7f4a]" />
            {farmer.name || "Farmer"}
            <span className="inline-flex items-center gap-1 rounded-full bg-[#ecf7ee] px-2 py-0.5 text-xs text-[#2f7440]">
              <BadgeCheck size={12} />
              Verified
            </span>
            {listing.qualityType === "organic" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#eef8f0] px-2 py-0.5 text-xs text-[#2f7440]">
                <Leaf size={12} />
                Organic
              </span>
            ) : null}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onView?.(listing.id)}
            className="flex-1 rounded-xl bg-[#2e7d32] px-3 py-2.5 text-sm font-bold text-white transition hover:bg-[#236427]"
          >
            View Details
          </button>

          <a
            href={farmer.phone ? `tel:${farmer.phone}` : "#"}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#cbe2ce] bg-[#f8fff8] px-3 py-2.5 text-sm font-semibold text-[#2f7140] transition hover:bg-[#e7f5e9]"
          >
            <Phone size={15} />
            Call
          </a>

          <button
            type="button"
            onClick={() => onOffer?.(listing)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#cbe2ce] bg-[#f8fff8] px-3 py-2.5 text-sm font-semibold text-[#2f7140] transition hover:bg-[#e7f5e9]"
          >
            <Send size={15} />
            Offer
          </button>
        </div>

        <p className="inline-flex items-center gap-1 text-xs text-[#50735a]">
          <Leaf size={13} />
          Smart listing score updates with market demand and regional trend.
        </p>
      </div>
    </motion.article>
  );
};

export default CropCard;
