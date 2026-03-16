import { motion } from "framer-motion";
import { ShieldCheck, Loader2, Lock } from "lucide-react";

export default function PayButton({ onClick, loading, disabled, amount, method }) {
  const label = {
    razorpay: "Pay with Razorpay",
    stripe:   "Pay with Stripe",
    wallet:   "Pay from Wallet",
  }[method] ?? "Pay Now";

  return (
    <div className="space-y-3">
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        disabled={disabled || loading}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-green-700 to-emerald-600 hover:from-green-800 hover:to-emerald-700 text-white font-bold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 shadow-lg shadow-green-900/25"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Processing Payment...
          </>
        ) : (
          <>
            <Lock size={16} />
            {label} · ₹{amount?.toFixed(2)}
          </>
        )}
      </motion.button>

      <div className="flex items-center justify-center gap-4 text-slate-400 text-xs">
        <span className="flex items-center gap-1">
          <ShieldCheck size={11} className="text-green-600" /> SSL Secured
        </span>
        <span className="text-slate-200">|</span>
        <span className="flex items-center gap-1">
          <ShieldCheck size={11} className="text-green-600" /> Escrow Protected
        </span>
        <span className="text-slate-200">|</span>
        <span className="flex items-center gap-1">
          <ShieldCheck size={11} className="text-green-600" /> PCI Compliant
        </span>
      </div>
    </div>
  );
}
