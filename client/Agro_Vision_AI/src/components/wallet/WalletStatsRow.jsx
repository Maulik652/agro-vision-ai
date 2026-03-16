/**
 * WalletStatsRow — quick summary cards: total topped up, total spent, total refunded
 */
import { motion } from "framer-motion";
import { TrendingUp, ShoppingBag, RotateCcw } from "lucide-react";

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);

const STATS = [
  { key: "topup",         label: "Total Added",   icon: TrendingUp,  color: "text-blue-600",   bg: "bg-blue-50" },
  { key: "order_payment", label: "Total Spent",   icon: ShoppingBag, color: "text-orange-600", bg: "bg-orange-50" },
  { key: "refund",        label: "Total Refunds", icon: RotateCcw,   color: "text-green-600",  bg: "bg-green-50" },
];

export default function WalletStatsRow({ transactions = [] }) {
  const totals = transactions.reduce((acc, tx) => {
    if (tx.category in acc) acc[tx.category] += tx.amount;
    return acc;
  }, { topup: 0, order_payment: 0, refund: 0 });

  return (
    <div className="grid grid-cols-3 gap-3">
      {STATS.map(({ key, label, icon: Icon, color, bg }, i) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4"
        >
          <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mb-2`}>
            <Icon size={15} className={color} />
          </div>
          <p className="text-slate-800 font-bold text-base">{fmt(totals[key])}</p>
          <p className="text-slate-400 text-xs mt-0.5">{label}</p>
        </motion.div>
      ))}
    </div>
  );
}
