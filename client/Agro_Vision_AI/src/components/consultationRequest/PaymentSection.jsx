import { motion } from "framer-motion";
import { CreditCard, Wallet, Smartphone } from "lucide-react";

const METHODS = [
  { value: "razorpay", label: "Razorpay",   icon: Smartphone, desc: "UPI, Cards, Net Banking" },
  { value: "stripe",   label: "Stripe",     icon: CreditCard, desc: "International cards" },
  { value: "wallet",   label: "Wallet",     icon: Wallet,     desc: "Use AgroVision wallet" },
];

export default function PaymentSection({ method, onSelect, walletBalance = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-4"
    >
      <div>
        <h2 className="text-slate-900 font-semibold text-lg">Payment Method</h2>
        <p className="text-slate-500 text-xs mt-0.5">Choose how you want to pay</p>
      </div>

      <div className="space-y-3">
        {METHODS.map(({ value, label, icon: Icon, desc }) => (
          <button
            key={value}
            onClick={() => onSelect(value)}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
              method === value
                ? "bg-green-100 border-green-300"
                : "bg-slate-50 border-slate-100 hover:border-slate-200"
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${method === value ? "bg-green-100" : "bg-white/10"}`}>
              <Icon size={18} className={method === value ? "text-green-400" : "text-slate-400"} />
            </div>
            <div className="text-left flex-1">
              <p className={`font-medium text-sm ${method === value ? "text-slate-900" : "text-slate-500"}`}>{label}</p>
              <p className="text-slate-400 text-xs">
                {value === "wallet" ? `Balance: ₹${walletBalance.toLocaleString()}` : desc}
              </p>
            </div>
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
              method === value ? "border-green-400" : "border-slate-200"
            }`}>
              {method === value && <div className="w-2 h-2 rounded-full bg-green-400" />}
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
