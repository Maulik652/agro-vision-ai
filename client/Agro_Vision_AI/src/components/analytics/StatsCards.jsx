/**
 * StatsCards — 4 overview metric cards with Framer Motion animation
 */
import { motion } from "framer-motion";
import { ShoppingCart, IndianRupee, Clock, CheckCircle2 } from "lucide-react";

const fmt = (v) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v ?? 0);

const CARDS = [
  { key: "totalOrders",     label: "Total Orders",     icon: ShoppingCart,  color: "bg-blue-50 text-blue-600",   fmt: (v) => v ?? 0 },
  { key: "totalSpent",      label: "Total Spending",   icon: IndianRupee,   color: "bg-green-50 text-green-600", fmt },
  { key: "activeOrders",    label: "Active Orders",    icon: Clock,         color: "bg-amber-50 text-amber-600", fmt: (v) => v ?? 0 },
  { key: "completedOrders", label: "Completed Orders", icon: CheckCircle2,  color: "bg-emerald-50 text-emerald-600", fmt: (v) => v ?? 0 },
];

const Skeleton = () => (
  <div className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
);

export default function StatsCards({ data, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {CARDS.map((_, i) => <Skeleton key={i} />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS.map((card, i) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.07 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
              <Icon size={17} />
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {card.fmt(data?.[card.key])}
            </p>
            <p className="text-xs text-slate-500 mt-1">{card.label}</p>
          </motion.div>
        );
      })}
    </div>
  );
}
