import { Truck, Zap } from "lucide-react";
import useCheckoutStore from "../../store/checkoutStore.js";

const OPTIONS = [
  {
    value: "standard",
    label: "Standard Delivery",
    sub: "3–5 business days",
    icon: Truck,
    color: "text-slate-600",
  },
  {
    value: "express",
    label: "Express Delivery",
    sub: "1–2 business days",
    icon: Zap,
    color: "text-amber-600",
  },
];

export default function DeliveryOptions() {
  const { deliveryType, setDeliveryType } = useCheckoutStore();

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
      <h3 className="text-slate-800 font-semibold text-sm mb-4 flex items-center gap-2">
        <Truck size={15} className="text-green-700" /> Delivery Options
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = deliveryType === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setDeliveryType(opt.value)}
              className={`flex flex-col items-start gap-1.5 p-4 rounded-xl border-2 transition-all text-left ${
                active
                  ? "border-green-600 bg-green-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <Icon size={18} className={active ? "text-green-700" : opt.color} />
              <p className={`text-sm font-semibold ${active ? "text-green-800" : "text-slate-700"}`}>
                {opt.label}
              </p>
              <p className="text-xs text-slate-400">{opt.sub}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
