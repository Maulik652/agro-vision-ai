import React from "react";
import { motion } from "framer-motion";
import { Package, TrendingUp, IndianRupee, ShoppingCart, Brain } from "lucide-react";

const cards = [
  { key: "totalListings",  label: "Total Listings",    icon: Package,      color: "emerald", fmt: (v) => v?.toLocaleString() || "0" },
  { key: "totalOrders",    label: "Total Orders",      icon: ShoppingCart, color: "blue",    fmt: (v) => v?.toLocaleString() || "0" },
  { key: "totalVolume",    label: "Sales Volume (kg)", icon: TrendingUp,   color: "violet",  fmt: (v) => v?.toLocaleString() || "0" },
  { key: "totalRevenue",   label: "Revenue Generated", icon: IndianRupee,  color: "amber",   fmt: (v) => `₹${(v || 0).toLocaleString()}` },
  { key: "aiAccuracy",     label: "AI Accuracy",       icon: Brain,        color: "rose",    fmt: (v) => `${v || 0}%` }
];

const colorMap = {
  emerald: { bg: "bg-emerald-100", text: "text-emerald-700", icon: "text-emerald-600" },
  blue:    { bg: "bg-blue-100",    text: "text-blue-700",    icon: "text-blue-600" },
  violet:  { bg: "bg-violet-100",  text: "text-violet-700",  icon: "text-violet-600" },
  amber:   { bg: "bg-amber-100",   text: "text-amber-700",   icon: "text-amber-600" },
  rose:    { bg: "bg-rose-100",    text: "text-rose-700",    icon: "text-rose-600" }
};

const MetricsCards = ({ data, loading }) => (
  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
    {cards.map(({ key, label, icon: Icon, color, fmt }, i) => {
      const c = colorMap[color];
      return (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="bg-white border border-slate-200 shadow-sm rounded-xl p-4"
        >
          <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center mb-3`}>
            <Icon size={18} className={c.icon} />
          </div>
          {loading ? (
            <div className="h-7 w-20 bg-slate-100 rounded animate-pulse mb-1" />
          ) : (
            <p className={`text-xl font-bold ${c.text}`}>{fmt(data?.[key])}</p>
          )}
          <p className="text-xs text-slate-500 mt-1">{label}</p>
        </motion.div>
      );
    })}
  </div>
);

export default MetricsCards;
