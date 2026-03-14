import React from "react";
import { motion } from "framer-motion";
import { Wallet, Clock3, CircleDollarSign, CalendarClock } from "lucide-react";

const metrics = [
  { key: "balance", label: "Wallet Balance", icon: Wallet, unit: "Rs" },
  { key: "pendingPayments", label: "Pending Payments", icon: Clock3, unit: "Rs" },
  { key: "escrowBalance", label: "Escrow Balance", icon: CircleDollarSign, unit: "Rs" },
  { key: "lastTransaction", label: "Last Transaction", icon: CalendarClock, unit: "" }
];

const WalletOverview = ({ wallet = {} }) => {
  const getValue = (metric) => {
    if (metric.key === "lastTransaction") {
      const last = wallet.lastTransaction || {};
      return last.date ? `${new Date(last.date).toLocaleDateString()} • ${last.type} ${last.amount ? `Rs ${last.amount}` : ''}` : "No data";
    }

    const raw = Number(wallet[metric.key] || 0);
    return `${metric.unit}${Number(raw).toLocaleString("en-IN", {maximumFractionDigits:2})}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="grid grid-cols-1 gap-3 md:grid-cols-4"
    >
      {metrics.map((item) => {
        const Icon = item.icon;
        return (
          <article key={item.key} className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-md">
            <div className="flex items-center justify-between">
              <h4 className="text-sm text-slate-300">{item.label}</h4>
              <Icon className="h-5 w-5 text-indigo-300" />
            </div>
            <p className="mt-3 text-xl font-semibold text-white">{getValue(item)}</p>
          </article>
        );
      })}
    </motion.div>
  );
};

export default WalletOverview;
