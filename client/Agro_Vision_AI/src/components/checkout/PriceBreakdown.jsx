import { motion } from "framer-motion";

const Row = ({ label, value, bold, green }) => (
  <div className={`flex justify-between text-sm ${bold ? "font-semibold" : ""}`}>
    <span className={bold ? "text-slate-800" : "text-slate-500"}>{label}</span>
    <span className={green ? "text-green-700 font-bold" : bold ? "text-slate-800" : "text-slate-700"}>
      {value}
    </span>
  </div>
);

export default function PriceBreakdown({ summary }) {
  if (!summary) return null;
  const { subtotal, deliveryCost, serviceFee, tax, grandTotal } = summary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3"
    >
      <h3 className="text-slate-800 font-semibold text-sm mb-1">Price Breakdown</h3>
      <Row label="Subtotal"        value={`₹${subtotal?.toFixed(2)}`} />
      <Row label="Delivery"        value={`₹${deliveryCost?.toFixed(2)}`} />
      <Row label="Platform Fee"    value={`₹${serviceFee?.toFixed(2)}`} />
      <Row label="Tax (5%)"        value={`₹${tax?.toFixed(2)}`} />
      <div className="border-t border-slate-100 pt-3">
        <Row label="Grand Total" value={`₹${grandTotal?.toFixed(2)}`} bold green />
      </div>
    </motion.div>
  );
}
