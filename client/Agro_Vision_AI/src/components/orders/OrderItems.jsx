/**
 * OrderItems — displays the list of crops purchased in an order
 */
import { motion } from "framer-motion";
import { Wheat } from "lucide-react";

const formatCurrency = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function OrderItems({ items = [], farmerName }) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
          className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-100"
        >
          {/* Crop image */}
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-green-50 shrink-0 flex items-center justify-center">
            {item.cropImage ? (
              <img
                src={item.cropImage}
                alt={item.cropName}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            ) : (
              <Wheat size={22} className="text-green-400" />
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <p className="text-slate-800 font-semibold text-sm truncate">{item.cropName}</p>
            <p className="text-slate-400 text-xs mt-0.5">
              Farmer: <span className="text-slate-600">{farmerName ?? item.farmerName ?? "—"}</span>
            </p>
            <p className="text-slate-400 text-xs">
              {item.quantity} {item.unit ?? "kg"} × {formatCurrency(item.pricePerKg)}/kg
            </p>
          </div>

          {/* Item total */}
          <div className="text-right shrink-0">
            <p className="text-slate-800 font-bold text-sm">{formatCurrency(item.subtotal)}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
