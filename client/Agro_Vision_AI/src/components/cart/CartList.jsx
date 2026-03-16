/**
 * CartList — renders items grouped by farmer
 */
import { AnimatePresence, motion } from "framer-motion";
import { User2 } from "lucide-react";
import CartItem from "./CartItem.jsx";

export default function CartList({ groupedByFarmer, onRemove, onQtyChange, disabled }) {
  if (!groupedByFarmer?.length) return null;

  return (
    <div className="space-y-6">
      <AnimatePresence mode="popLayout">
        {groupedByFarmer.map((group) => (
          <motion.div
            key={group.farmerId}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            {/* Farmer header */}
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <User2 size={12} className="text-green-700" />
              </div>
              <span className="text-slate-600 text-xs font-semibold uppercase tracking-wide">
                {group.farmerName}
              </span>
              <span className="text-slate-300 text-xs">
                · {group.items.length} item{group.items.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Items */}
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {group.items.map((item) => (
                  <CartItem
                    key={item.crop}
                    item={item}
                    onRemove={onRemove}
                    onQtyChange={onQtyChange}
                    disabled={disabled}
                  />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
