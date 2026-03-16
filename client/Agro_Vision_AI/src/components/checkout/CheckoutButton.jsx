import { Loader2, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function CheckoutButton({ onClick, loading, disabled, grandTotal }) {
  return (
    <motion.div whileTap={{ scale: 0.98 }}>
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className="w-full py-4 rounded-2xl bg-green-700 hover:bg-green-800 text-white font-bold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-green-900/20"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <ShieldCheck size={18} />
            Place Order · ₹{grandTotal?.toFixed(2)}
          </>
        )}
      </button>
      <p className="text-center text-slate-400 text-xs mt-2 flex items-center justify-center gap-1">
        <ShieldCheck size={11} className="text-green-600" />
        Secured by Razorpay / Stripe
      </p>
    </motion.div>
  );
}
