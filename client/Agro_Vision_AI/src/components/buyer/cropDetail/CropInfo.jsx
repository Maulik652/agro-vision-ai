import { motion } from "framer-motion";
import {
  Leaf, MapPin, Package, Calendar, Droplets, Clock,
  Truck, Award, Tag, Shield, Zap, AlertCircle, Info, BarChart2
} from "lucide-react";

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const gradeStyle = (g) =>
  g === "A" ? "text-emerald-700 bg-emerald-50 border-emerald-200"
  : g === "B" ? "text-amber-700 bg-amber-50 border-amber-200"
  : "text-red-700 bg-red-50 border-red-200";

const urgencyStyle = (u) =>
  u === "HIGH" ? "text-red-700 bg-red-50 border-red-200"
  : u === "MEDIUM" ? "text-amber-700 bg-amber-50 border-amber-200"
  : "text-emerald-700 bg-emerald-50 border-emerald-200";

export default function CropInfo({ crop }) {
  if (!crop) return null;

  const demand = crop.aiSellReadiness ?? 60;
  const demandBar = demand >= 70 ? "bg-emerald-500" : demand >= 45 ? "bg-amber-500" : "bg-red-400";
  const demandText = demand >= 70 ? "text-emerald-700" : demand >= 45 ? "text-amber-700" : "text-red-600";

  return (
    <div className="space-y-4">
      {/* Badges + title */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {crop.qualityType === "organic" && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              <Leaf size={11} /> Organic
            </span>
          )}
          <span className={`px-2.5 py-1 rounded-full border text-xs font-bold ${gradeStyle(crop.grade)}`}>
            Grade {crop.grade}
          </span>
          {crop.negotiable && (
            <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
              Negotiable
            </span>
          )}
          {crop.aiUrgency && (
            <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold ${urgencyStyle(crop.aiUrgency)}`}>
              <AlertCircle size={10} /> {crop.aiUrgency} Urgency
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-slate-800 leading-tight">
          {crop.cropName}
          {crop.variety && <span className="text-slate-400 font-normal text-lg ml-2">· {crop.variety}</span>}
        </h1>
        <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-1">
          <MapPin size={13} /> {crop.location?.city}, {crop.location?.state}
        </div>
      </div>

      {/* Price card */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-4xl font-bold text-slate-900">₹{crop.price}</span>
          <span className="text-slate-400 text-base">/{crop.quantityUnit ?? "kg"}</span>
        </div>
        {crop.aiSuggestedPrice && (
          <div className="flex items-center gap-2 mt-1">
            <span className="flex items-center gap-1 text-green-700 text-xs font-medium">
              <Zap size={10} /> AI suggests ₹{crop.aiSuggestedPrice}
            </span>
            {crop.aiConfidence && (
              <span className="text-slate-400 text-xs">· {crop.aiConfidence}% confidence</span>
            )}
          </div>
        )}
        {crop.aiPriceBand?.ideal && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-slate-400 text-[10px] mb-2 flex items-center gap-1">
              <Info size={10} /> AI Price Band
            </p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Min <span className="text-slate-800 font-medium">₹{crop.aiPriceBand.min}</span></span>
              <span className="text-green-700 font-bold text-sm">Ideal ₹{crop.aiPriceBand.ideal}</span>
              <span className="text-slate-500">Max <span className="text-slate-800 font-medium">₹{crop.aiPriceBand.max}</span></span>
            </div>
          </div>
        )}
      </div>

      {/* Demand bar */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <span className="text-slate-500 text-xs flex items-center gap-1.5">
            <BarChart2 size={12} /> Market Demand Score
          </span>
          <span className={`font-bold text-sm ${demandText}`}>{demand}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${demand}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`h-full rounded-full ${demandBar}`}
          />
        </div>
        <p className={`text-xs mt-1.5 ${demandText}`}>
          {demand >= 70 ? "High demand — good time to buy" : demand >= 45 ? "Moderate demand" : "Low demand"}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: <Package size={13} />, label: "Available Stock", value: `${crop.quantity?.toLocaleString()} ${crop.quantityUnit ?? "kg"}` },
          { icon: <Tag size={13} />, label: "Min Order", value: `${crop.minOrderQty ?? 1} ${crop.quantityUnit ?? "kg"}` },
          { icon: <Calendar size={13} />, label: "Harvest Date", value: formatDate(crop.harvestDate) },
          { icon: <Droplets size={13} />, label: "Moisture Level", value: crop.moisturePercent != null ? `${crop.moisturePercent}%` : "—" },
          { icon: <Clock size={13} />, label: "Shelf Life", value: `${crop.shelfLifeDays ?? "—"} days` },
          { icon: <Shield size={13} />, label: "Response SLA", value: `Within ${crop.responseSlaHours ?? 12}h` },
        ].map((item, i) => (
          <div key={i} className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] mb-1.5">{item.icon} {item.label}</div>
            <p className="text-slate-800 text-sm font-semibold">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Delivery & Packaging */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
        <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
          <Truck size={12} className="text-blue-500" /> Delivery & Packaging
        </h3>
        <div className="flex flex-wrap gap-2">
          {(crop.deliveryOptions ?? []).map((d, i) => (
            <span key={i} className="px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs capitalize">
              {d.replace(/-/g, " ")}
            </span>
          ))}
          {crop.packagingType && (
            <span className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-xs capitalize">
              {crop.packagingType.replace(/-/g, " ")}
            </span>
          )}
        </div>
        {crop.certifications?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
            {crop.certifications.map((c, i) => (
              <span key={i} className="flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs">
                <Award size={10} /> {c}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
