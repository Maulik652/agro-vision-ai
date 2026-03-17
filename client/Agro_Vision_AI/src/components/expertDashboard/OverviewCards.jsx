import { motion } from "framer-motion";
import { Users, Sprout, ShoppingBag, TrendingUp, Loader2 } from "lucide-react";

const cards = [
  { key: "totalFarmers",     label: "Total Farmers",       icon: Users,       color: "from-emerald-500 to-teal-600" },
  { key: "activeCrops",      label: "Active Crop Listings", icon: Sprout,      color: "from-green-500 to-emerald-600" },
  { key: "activeOrders",     label: "Active Orders",        icon: ShoppingBag, color: "from-teal-500 to-cyan-600" },
  { key: "totalMarketValue", label: "Marketplace Value",    icon: TrendingUp,  color: "from-cyan-500 to-blue-600", currency: true }
];

const fmt = (v, currency) =>
  currency
    ? `₹${Number(v || 0).toLocaleString("en-IN")}`
    : Number(v || 0).toLocaleString("en-IN");

export default function OverviewCards({ data, isLoading }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <motion.div
            key={c.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm p-6"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${c.color} opacity-10 rounded-2xl`} />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{c.label}</p>
                {isLoading ? (
                  <Loader2 className="mt-2 animate-spin text-slate-300" size={22} />
                ) : (
                  <p className="mt-1 text-2xl font-bold text-slate-900">{fmt(data?.[c.key], c.currency)}</p>
                )}
              </div>
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${c.color} shadow-md`}>
                <Icon size={20} className="text-white" />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
