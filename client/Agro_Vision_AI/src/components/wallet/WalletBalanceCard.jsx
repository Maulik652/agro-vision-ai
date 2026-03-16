/**
 * WalletBalanceCard — hero card showing current balance + Add Money CTA
 */
import { motion } from "framer-motion";
import { Wallet, Plus, RefreshCw } from "lucide-react";

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n ?? 0);

export default function WalletBalanceCard({ balance, isLoading, onAddMoney }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-700 via-green-800 to-emerald-900 text-white shadow-xl p-6"
    >
      {/* Decorative circles */}
      <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
      <div className="absolute -bottom-10 -left-6 w-32 h-32 rounded-full bg-white/5" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4 opacity-80">
          <Wallet size={16} />
          <span className="text-sm font-medium tracking-wide">AgroVision Wallet</span>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 mb-6">
            <RefreshCw size={18} className="animate-spin opacity-60" />
            <span className="text-lg opacity-60">Loading...</span>
          </div>
        ) : (
          <div className="mb-6">
            <p className="text-xs opacity-60 mb-1">Available Balance</p>
            <p className="text-4xl font-bold tracking-tight">{fmt(balance)}</p>
          </div>
        )}

        <button
          onClick={onAddMoney}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-green-800 text-sm font-bold hover:bg-green-50 transition-all shadow-sm"
        >
          <Plus size={15} /> Add Money
        </button>
      </div>
    </motion.div>
  );
}
