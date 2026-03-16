/**
 * CartSummary — sticky order summary panel with full price breakdown
 */
import { motion } from "framer-motion";
import { Tag, ArrowRight, Award, Leaf, Package, ShieldCheck } from "lucide-react";
import DeliveryEstimator from "./DeliveryEstimator.jsx";

const Row = ({ label, value, highlight, small }) => (
  <div className="flex justify-between items-center">
    <span className={`${small ? "text-[11px]" : "text-sm"} text-slate-500`}>{label}</span>
    <span
      className={`${small ? "text-[11px]" : "text-sm"} font-medium ${
        highlight ? "text-green-700" : "text-slate-800"
      }`}
    >
      {value}
    </span>
  </div>
);

export default function CartSummary({
  cart,
  deliveryEstimate,
  deliveryLoading,
  onCheckout,
  checkoutDisabled,
}) {
  if (!cart) return null;

  const { subtotal, deliveryCost, serviceFee, tax, grandTotal, itemCount } = cart;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="bg-white border border-slate-100 rounded-2xl p-5 sticky top-24 shadow-sm"
    >
      <h2 className="text-slate-800 font-semibold text-sm mb-4 flex items-center gap-2">
        <Tag size={14} className="text-green-700" /> Order Summary
      </h2>

      {/* Price rows */}
      <div className="space-y-3 mb-4">
        <Row label={`Subtotal (${itemCount ?? 0} items)`} value={`₹${subtotal?.toLocaleString("en-IN") ?? 0}`} />
        <Row label="Platform Fee (1.5%)" value={`₹${serviceFee?.toLocaleString("en-IN") ?? 0}`} />
        <Row label="Delivery" value={`₹${deliveryCost?.toLocaleString("en-IN") ?? 0}`} />
        <Row label="GST (5%)" value={`₹${tax?.toLocaleString("en-IN") ?? 0}`} />
      </div>

      {/* Delivery estimator accordion */}
      <div className="mb-4">
        <DeliveryEstimator estimate={deliveryEstimate} isLoading={deliveryLoading} />
      </div>

      {/* Grand total */}
      <div className="border-t border-slate-100 pt-4 mb-5">
        <div className="flex justify-between items-center">
          <span className="text-slate-800 font-bold text-sm">Grand Total</span>
          <span className="text-green-700 font-bold text-xl tabular-nums">
            ₹{grandTotal?.toLocaleString("en-IN") ?? 0}
          </span>
        </div>
        <p className="text-slate-400 text-[10px] mt-1">Inclusive of all taxes</p>
      </div>

      {/* CTA */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onCheckout}
        disabled={checkoutDisabled}
        className="w-full py-3.5 rounded-xl bg-green-700 hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
      >
        Proceed to Checkout <ArrowRight size={15} />
      </motion.button>

      {/* Trust badges */}
      <div className="mt-4 space-y-2">
        {[
          { icon: <Award size={11} />, text: "Verified farmer listings" },
          { icon: <Leaf size={11} />, text: "Fresh, quality-checked produce" },
          { icon: <Package size={11} />, text: "Flexible delivery options" },
          { icon: <ShieldCheck size={11} />, text: "Secure payment gateway" },
        ].map((b, i) => (
          <div key={i} className="flex items-center gap-2 text-slate-400 text-[11px]">
            <span className="text-green-700">{b.icon}</span>
            {b.text}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
