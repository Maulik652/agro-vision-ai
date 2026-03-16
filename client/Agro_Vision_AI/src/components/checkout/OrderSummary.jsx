import { motion } from "framer-motion";
import { Package, User } from "lucide-react";

const PLACEHOLDER = "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=120&q=70";

export default function OrderSummary({ groups = [] }) {
  return (
    <div className="space-y-4">
      <h2 className="text-slate-800 font-semibold text-base flex items-center gap-2">
        <Package size={16} className="text-green-700" /> Order Summary
      </h2>

      {groups.map((group, gi) => (
        <motion.div
          key={group.farmerId}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: gi * 0.06 }}
          className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm"
        >
          {/* Farmer header */}
          <div className="flex items-center gap-2 px-5 py-3 bg-green-50 border-b border-green-100">
            <div className="w-6 h-6 rounded-full bg-green-700 flex items-center justify-center">
              <User size={12} className="text-white" />
            </div>
            <span className="text-green-800 text-xs font-semibold">{group.farmerName}</span>
          </div>

          {/* Items */}
          <div className="divide-y divide-slate-50">
            {group.items.map((item, ii) => (
              <div key={ii} className="flex items-center gap-4 px-5 py-4">
                <img
                  src={item.cropImage || PLACEHOLDER}
                  alt={item.cropName}
                  onError={(e) => { e.target.src = PLACEHOLDER; }}
                  className="w-14 h-14 rounded-xl object-cover bg-slate-100 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-800 font-medium text-sm truncate">{item.cropName}</p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    ₹{item.pricePerKg}/{item.unit ?? "kg"} × {item.quantity} {item.unit ?? "kg"}
                  </p>
                </div>
                <p className="text-slate-800 font-semibold text-sm shrink-0">
                  ₹{(item.pricePerKg * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {/* Per-farmer subtotal */}
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between text-xs text-slate-500">
            <span>Farmer subtotal</span>
            <span className="font-semibold text-slate-700">₹{group.subtotal?.toFixed(2)}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
