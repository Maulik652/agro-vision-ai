/**
 * DeliveryEstimator — shows per-farmer delivery breakdown
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, ChevronDown, MapPin } from "lucide-react";

export default function DeliveryEstimator({ estimate, isLoading }) {
  const [open, setOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="animate-pulse flex items-center gap-2 py-2">
        <div className="w-4 h-4 rounded bg-slate-200" />
        <div className="h-3 w-32 bg-slate-200 rounded" />
      </div>
    );
  }

  if (!estimate?.breakdown?.length) return null;

  const { totalDeliveryCost, breakdown } = estimate;

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Truck size={14} className="text-green-700" />
          <span className="text-slate-700 text-xs font-semibold">Delivery Breakdown</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-700 text-xs font-bold">
            ₹{totalDeliveryCost.toLocaleString("en-IN")}
          </span>
          <ChevronDown
            size={14}
            className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 space-y-2.5 bg-white">
              {breakdown.map((b, i) => (
                <div key={i} className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-1.5">
                    <MapPin size={11} className="text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-slate-700 text-xs font-medium">{b.farmerName}</p>
                      <p className="text-slate-400 text-[10px]">
                        {b.weightKg} kg · ~{b.distanceKm} km · {b.zone}
                      </p>
                    </div>
                  </div>
                  <span className="text-slate-700 text-xs font-semibold shrink-0">
                    ₹{b.cost.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
