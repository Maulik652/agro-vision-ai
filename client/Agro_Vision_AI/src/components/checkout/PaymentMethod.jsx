import { CreditCard, Wallet } from "lucide-react";
import useCheckoutStore from "../../store/checkoutStore.js";

const METHODS = [
  { value: "razorpay", label: "Razorpay", sub: "UPI, Cards, Net Banking", icon: "💳" },
  { value: "stripe",   label: "Stripe",   sub: "International Cards",      icon: "🌐" },
  { value: "wallet",   label: "Wallet",   sub: "AgroVision Wallet",        icon: "👛" },
];

export default function PaymentMethod() {
  const { paymentMethod, setPaymentMethod } = useCheckoutStore();

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
      <h3 className="text-slate-800 font-semibold text-sm mb-4 flex items-center gap-2">
        <CreditCard size={15} className="text-green-700" /> Payment Method
      </h3>
      <div className="space-y-2.5">
        {METHODS.map((m) => {
          const active = paymentMethod === m.value;
          return (
            <button
              key={m.value}
              onClick={() => setPaymentMethod(m.value)}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${
                active
                  ? "border-green-600 bg-green-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span className="text-xl">{m.icon}</span>
              <div className="flex-1">
                <p className={`text-sm font-semibold ${active ? "text-green-800" : "text-slate-700"}`}>
                  {m.label}
                </p>
                <p className="text-xs text-slate-400">{m.sub}</p>
              </div>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                active ? "border-green-600" : "border-slate-300"
              }`}>
                {active && <div className="w-2 h-2 rounded-full bg-green-600" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
