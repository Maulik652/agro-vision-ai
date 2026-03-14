import { motion as Motion } from "framer-motion";
import { CalendarDays, MapPin, MessageCircle, ShoppingCart, Star } from "lucide-react";
import QualityBadge from "./QualityBadge";

const formatCurrency = (value) =>
  `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Number(value || 0))}`;

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

const optimizeCloudinary = (url) => {
  if (!url || typeof url !== "string") {
    return "";
  }

  if (!url.includes("res.cloudinary.com")) {
    return url;
  }

  if (url.includes("/upload/f_auto,q_auto/")) {
    return url;
  }

  return url.replace("/upload/", "/upload/f_auto,q_auto,w_800/");
};

const CropCard = ({ crop, onViewDetails, onChatFarmer, onAddToCart, isAdding = false }) => {
  const image = optimizeCloudinary(crop.images?.[0] || "");
  const demandPercent = Math.round(Number(crop.aiDemandScore || 0) * 100);

  return (
    <Motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="overflow-hidden rounded-2xl border border-[#d8e9dc] bg-white shadow-[0_14px_30px_-24px_rgba(20,78,37,0.5)]"
    >
      <div className="h-44 overflow-hidden bg-[#ebf6ee]">
        {image ? (
          <img
            src={image}
            alt={crop.cropName}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-110"
          />
        ) : null}
      </div>

      <div className="space-y-2 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold text-[#1b4f29]">{crop.cropName}</h3>
            <p className="text-xs font-semibold text-[#5f8268]">{crop.category || "General"}</p>
          </div>
          <span className="rounded-full bg-[#f0f5ff] px-2 py-0.5 text-xs font-bold text-[#4b61ba]">
            AI {Number.isFinite(demandPercent) ? demandPercent : 0}%
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-[#f4fbf5] p-2.5">
            <p className="text-[11px] text-[#64866d]">Price per kg</p>
            <p className="text-sm font-extrabold text-[#1b4f29]">{formatCurrency(crop.pricePerKg)}</p>
          </div>
          <div className="rounded-xl bg-[#f4fbf5] p-2.5">
            <p className="text-[11px] text-[#64866d]">Available qty</p>
            <p className="text-sm font-extrabold text-[#1b4f29]">
              {Number(crop.quantityAvailable || 0).toLocaleString("en-IN")} kg
            </p>
          </div>
        </div>

        <QualityBadge
          organicCertified={crop.organicCertified}
          qualityGrade={crop.qualityGrade}
          moistureLevel={crop.moistureLevel}
        />

        <div className="space-y-1.5 text-xs text-[#4d7357]">
          <p className="inline-flex items-center gap-1.5">
            <Star size={13} className="text-amber-500" />
            {crop.farmer?.name || "Farmer"} · {Number(crop.farmer?.rating || 0).toFixed(1)}
          </p>
          <p className="inline-flex items-center gap-1.5">
            <MapPin size={13} />
            {crop.farmer?.farmLocation || [crop.location?.city, crop.location?.state].filter(Boolean).join(", ")}
          </p>
          <p className="inline-flex items-center gap-1.5">
            <CalendarDays size={13} />
            Harvest: {formatDate(crop.harvestDate)}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => onViewDetails?.(crop)}
            className="rounded-lg border border-[#cfe2d3] bg-[#f8fff9] px-2 py-2 text-xs font-bold text-[#2d6f3e] transition hover:bg-[#e9f7ec]"
          >
            View details
          </button>
          <button
            type="button"
            onClick={() => onChatFarmer?.(crop)}
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#0f6cd2] px-2 py-2 text-xs font-bold text-white transition hover:bg-[#0c5db5]"
          >
            <MessageCircle size={13} />
            Chat farmer
          </button>
          <button
            type="button"
            onClick={() => onAddToCart?.(crop)}
            disabled={isAdding}
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-green-600 px-2 py-2 text-xs font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ShoppingCart size={13} />
            {isAdding ? "Adding" : "Add to cart"}
          </button>
        </div>
      </div>
    </Motion.article>
  );
};

export default CropCard;
