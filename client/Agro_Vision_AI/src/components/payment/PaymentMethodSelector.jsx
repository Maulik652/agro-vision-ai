import { motion } from "framer-motion";
import { CreditCard } from "lucide-react";
import usePaymentStore from "../../store/paymentStore.js";

const METHODS = [
  {
    value: "razorpay",
    label: "Razorpay",
    sub: "UPI · Cards · Net Banking · Wallets",
    badge: "Most Popular",
    badgeColor: "bg-green-100 text-green-700",
    icon: "💳",
  },
  {
    value: "stripe",
    label: "Stripe",
    sub: "International Cards · Apple Pay",
    badge: null,
    icon: "🌐",
  },
  {
    value: "wallet",
    label: "AgroVision Wallet",
    sub: "Instant · No gateway fees",
    badge: "Zero Fee",
    badgeColor: "bg-blue-100 text-blue-700",
    icon: "👛",
  },
];

export default function PaymentMethodSelector({ disabled }) {
  const { method, setMethod } = usePaymentStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm"
    >
      <h3 className="text-slate-800 font-bold text-sm flex items-center gap-2 mb-4">
        <CreditCard size={15} className="text-green-700" /> Payment Method
      </h3>

      <div className="space-y-2.5">
        {METHODS.map((m) => {
          const active = method === m.value;
          return (
            <button
              key={m.value}
              onClick={() => !disabled && setMethod(m.value)}
              disabled={disabled}
              className={`w-full flex items-center gap-3.5 p-4 rounded-xl border-2 transition-all text-left ${
                active
                  ? "border-green-600 bg-green-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span className="text-2xl">{m.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-bold ${active ? "text-green-800" : "text-slate-700"}`}>
                    {m.label}
                  </p>
                  {m.badge && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${m.badgeColor}`}>
                      {m.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{m.sub}</p>
              </div>
              {/* Radio indicator */}
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                active ? "border-green-600" : "border-slate-300"
              }`}>
                {active && (
                  <motion.div
                    layoutId="payment-radio"
                    className="w-2.5 h-2.5 rounded-full bg-green-600"
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
