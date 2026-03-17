import { motion } from "framer-motion";
import { Receipt, ShieldCheck } from "lucide-react";

const PLATFORM_FEE_RATE = 0.10; // 10%
const TAX_RATE          = 0.18; // 18% GST

export function calcPricing(consultationFee = 0) {
  const platformFee = Math.round(consultationFee * PLATFORM_FEE_RATE);
  const subtotal    = consultationFee + platformFee;
  const tax         = Math.round(subtotal * TAX_RATE);
  const total       = subtotal + tax;
  return { consultationFee, platformFee, tax, total };
}

export default function PriceSummary({ consultationFee = 0 }) {
  const { platformFee, tax, total } = calcPricing(consultationFee);

  const rows = [
    { label: "Consultation Fee", amount: consultationFee },
    { label: "Platform Fee (10%)", amount: platformFee },
    { label: "GST (18%)", amount: tax },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-4"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
          <Receipt size={18} className="text-emerald-600" />
        </div>
        <div>
          <h2 className="text-slate-900 font-semibold text-lg">Price Summary</h2>
          <p className="text-slate-500 text-xs">Transparent fee breakdown</p>
        </div>
      </div>

      <div className="space-y-3">
        {rows.map(({ label, amount }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-slate-500 text-sm">{label}</span>
            <span className="text-slate-700 text-sm font-medium">₹{amount.toLocaleString()}</span>
          </div>
        ))}
        <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
          <span className="text-slate-900 font-semibold">Total</span>
          <span className="text-emerald-600 font-bold text-xl">₹{total.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
        <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
        <p className="text-emerald-700 text-xs">Payment held in escrow — released to expert after consultation</p>
      </div>
    </motion.div>
  );
}
