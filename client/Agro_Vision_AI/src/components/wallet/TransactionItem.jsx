/**
 * TransactionItem — single row in the transaction history list
 */
import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import TransactionBadge from "./TransactionBadge.jsx";

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n ?? 0);

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function TransactionItem({ tx, index }) {
  const isCredit = tx.type === "credit";

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-center gap-4 py-3.5 border-b border-slate-50 last:border-0"
    >
      {/* Icon */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0
        ${isCredit ? "bg-green-50" : "bg-red-50"}`}
      >
        {isCredit
          ? <ArrowDownLeft size={16} className="text-green-600" />
          : <ArrowUpRight  size={16} className="text-red-500" />
        }
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-slate-700 text-sm font-medium truncate">
            {tx.description || tx.category}
          </p>
          <TransactionBadge category={tx.category} />
        </div>
        <p className="text-slate-400 text-xs">{formatDate(tx.createdAt)}</p>
        {tx.referenceId && (
          <p className="text-slate-300 text-[10px] mt-0.5 truncate">Ref: {tx.referenceId}</p>
        )}
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <p className={`font-bold text-sm ${isCredit ? "text-green-600" : "text-red-500"}`}>
          {isCredit ? "+" : "-"}{fmt(tx.amount)}
        </p>
        <p className="text-slate-400 text-[10px]">Bal: {fmt(tx.balanceAfter)}</p>
      </div>
    </motion.div>
  );
}
