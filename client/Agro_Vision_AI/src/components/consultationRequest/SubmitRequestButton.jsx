import { motion } from "framer-motion";
import { Send, Loader2, AlertCircle } from "lucide-react";

export default function SubmitRequestButton({ onClick, loading, disabled, error }) {
  return (
    <div className="space-y-3">
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl"
        >
          <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-red-600 text-sm">{error}</p>
        </motion.div>
      )}

      <motion.button
        whileHover={!disabled ? { scale: 1.01 } : {}}
        whileTap={!disabled ? { scale: 0.98 } : {}}
        onClick={onClick}
        disabled={disabled || loading}
        className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-semibold text-base transition-all ${
          disabled || loading
            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
            : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-200"
        }`}
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>Processing...</span>
          </>
        ) : (
          <>
            <Send size={18} />
            <span>Submit Consultation Request</span>
          </>
        )}
      </motion.button>

      <p className="text-slate-400 text-xs text-center">
        By submitting, you agree to our consultation terms. Payment is held in escrow.
      </p>
    </div>
  );
}
