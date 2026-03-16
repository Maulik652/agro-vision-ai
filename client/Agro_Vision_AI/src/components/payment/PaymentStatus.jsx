import { motion } from "framer-motion";
import { CheckCircle2, XCircle, RefreshCw, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function PaymentSuccess({ paymentId, grandTotal }) {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-[60vh] flex items-center justify-center"
    >
      <div className="text-center max-w-sm mx-auto px-6">
        {/* Animated checkmark */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
          className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle2 size={48} className="text-green-600" />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 className="text-slate-900 font-bold text-2xl mb-2">Payment Successful!</h2>
          <p className="text-slate-500 text-sm mb-1">Your order has been placed and is being processed.</p>
          {grandTotal && (
            <p className="text-green-700 font-bold text-lg mb-1">₹{grandTotal?.toFixed(2)} paid</p>
          )}
          {paymentId && (
            <p className="text-slate-400 text-xs mb-6">Payment ID: {paymentId}</p>
          )}

          <div className="space-y-3">
            <button
              onClick={() => navigate("/buyer/orders")}
              className="w-full py-3 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
            >
              View My Orders <ArrowRight size={14} />
            </button>
            <button
              onClick={() => navigate("/buyer/marketplace")}
              className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-all"
            >
              Continue Shopping
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export function PaymentFailed({ message, onRetry }) {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-[60vh] flex items-center justify-center"
    >
      <div className="text-center max-w-sm mx-auto px-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6"
        >
          <XCircle size={48} className="text-red-500" />
        </motion.div>

        <h2 className="text-slate-900 font-bold text-2xl mb-2">Payment Failed</h2>
        <p className="text-slate-500 text-sm mb-6">
          {message ?? "Something went wrong. Your order is saved — you can retry payment."}
        </p>

        <div className="space-y-3">
          <button
            onClick={onRetry}
            className="w-full py-3 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={14} /> Retry Payment
          </button>
          <button
            onClick={() => navigate("/buyer/orders")}
            className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-all"
          >
            View Orders
          </button>
        </div>
      </div>
    </motion.div>
  );
}
