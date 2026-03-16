import { motion } from "framer-motion";
import { Receipt } from "lucide-react";

function Row({ label, value, muted, highlight }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${muted ? "text-slate-400" : "text-slate-600"}`}>{label}</span>
      <span className={`text-sm font-semibold ${highlight ? "text-green-700 text-base" : "text-slate-800"}`}>
        {value}
      </span>
    </div>
  );
}

export default function PaymentBreakdown({ totals }) {
  if (!totals) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm"
    >
      <h3 className="text-slate-800 font-bold text-sm flex items-center gap-2 mb-4">
        <Receipt size={15} className="text-green-700" /> Price Breakdown
      </h3>

      <div className="space-y-3">
        <Row label="Subtotal"      value={`₹${totals.subtotal?.toFixed(2)}`} />
        <Row label="Delivery"      value={`₹${totals.deliveryCost?.toFixed(2)}`} muted />
        <Row label="Platform Fee"  value={`₹${totals.serviceFee?.toFixed(2)}`} muted />
        <Row label="Tax (5%)"      value={`₹${totals.tax?.toFixed(2)}`} muted />
      </div>

      <div className="mt-4 pt-4 border-t-2 border-dashed border-slate-100">
        <Row label="Total Payable" value={`₹${totals.grandTotal?.toFixed(2)}`} highlight />
      </div>

      {/* Savings badge */}
      <div className="mt-3 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-50 border border-green-100">
        <span className="text-green-700 text-xs font-semibold">
          🌿 Direct from farm — no middlemen markup
        </span>
      </div>
    </motion.div>
  );
}
