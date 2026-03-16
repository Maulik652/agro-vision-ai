import { motion } from "framer-motion";
import { MapPin, Truck, Calendar } from "lucide-react";

export default function DeliveryInfo({ address, deliveryType, estimatedDelivery }) {
  if (!address) return null;

  const deliveryDate = estimatedDelivery
    ? new Date(estimatedDelivery).toLocaleDateString("en-IN", {
        weekday: "short", day: "numeric", month: "short", year: "numeric",
      })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm"
    >
      <h3 className="text-slate-800 font-bold text-sm flex items-center gap-2 mb-4">
        <MapPin size={15} className="text-green-700" /> Delivery Address
      </h3>

      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
          <MapPin size={16} className="text-green-700" />
        </div>
        <div className="flex-1">
          <p className="text-slate-800 font-semibold text-sm">{address.fullName}</p>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed">
            {address.street}, {address.city},<br />
            {address.state} — {address.postalCode}
          </p>
          <p className="text-slate-400 text-xs mt-1">{address.phone}</p>
        </div>
      </div>

      {/* Delivery type + ETA */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Truck size={13} className={deliveryType === "express" ? "text-amber-500" : "text-slate-400"} />
          <span className="capitalize font-medium text-slate-700">{deliveryType} Delivery</span>
          <span className="text-slate-300">·</span>
          <span>{deliveryType === "express" ? "1–2 days" : "3–5 days"}</span>
        </div>
        {deliveryDate && (
          <div className="flex items-center gap-1.5 text-xs text-green-700 font-medium">
            <Calendar size={12} />
            By {deliveryDate}
          </div>
        )}
      </div>
    </motion.div>
  );
}
