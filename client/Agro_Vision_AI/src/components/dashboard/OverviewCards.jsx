import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { IndianRupee, PackageCheck, ShoppingBag, TrendingUp, Wallet } from "lucide-react";

const useCountUp = (target, duration = 1200) => {
  const [value, setValue] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const to = Number(target || 0);

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return value;
};

const formatINR = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

const CARDS = [
  {
    key: "totalOrders",
    label: "Total Orders",
    icon: ShoppingBag,
    gradient: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    format: (v) => Number(v || 0).toLocaleString("en-IN"),
    growth: "+12%",
    growthLabel: "vs last month"
  },
  {
    key: "totalSpending",
    label: "Total Spending",
    icon: IndianRupee,
    gradient: "from-green-600 to-emerald-500",
    bg: "bg-green-50",
    iconColor: "text-green-700",
    format: (v) => formatINR(Number(v || 0)),
    growth: "+8.4%",
    growthLabel: "vs last month"
  },
  {
    key: "walletBalance",
    label: "Wallet Balance",
    icon: Wallet,
    gradient: "from-teal-600 to-emerald-500",
    bg: "bg-teal-50",
    iconColor: "text-teal-700",
    format: (v) => formatINR(Number(v || 0)),
    growth: null,
    growthLabel: "available"
  },
  {
    key: "activeOrders",
    label: "Active Orders",
    icon: PackageCheck,
    gradient: "from-amber-500 to-orange-500",
    bg: "bg-amber-50",
    iconColor: "text-amber-600",
    format: (v) => Number(v || 0).toLocaleString("en-IN"),
    growth: null,
    growthLabel: "in progress"
  }
];

const Card = ({ card, value, isLoading, index }) => {
  const Icon = card.icon;
  const numericValue = Number(value || 0);
  const counted = useCountUp(numericValue);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      whileHover={{ y: -4, boxShadow: "0 20px 40px -12px rgba(0,0,0,0.12)" }}
      className="relative overflow-hidden rounded-2xl bg-white border border-slate-100 p-6 shadow-sm cursor-default"
    >
      {/* gradient accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient}`} />

      {isLoading ? (
        <div className="space-y-3 pt-2">
          <div className="h-4 w-1/2 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-8 w-3/4 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-3 w-1/3 animate-pulse rounded-lg bg-slate-100" />
        </div>
      ) : (
        <div className="pt-1">
          <div className="flex items-start justify-between mb-4">
            <div className={`inline-flex rounded-xl p-2.5 ${card.bg}`}>
              <Icon size={20} className={card.iconColor} />
            </div>
            {card.growth && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                <TrendingUp size={10} />
                {card.growth}
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">{card.label}</p>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">
            {card.format(counted)}
          </p>
          <p className="mt-1 text-xs text-slate-400">{card.growthLabel}</p>
        </div>
      )}
    </motion.article>
  );
};

const OverviewCards = ({ overview, isLoading }) => (
  <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
    {CARDS.map((card, index) => (
      <Card
        key={card.key}
        card={card}
        value={overview?.[card.key]}
        isLoading={isLoading}
        index={index}
      />
    ))}
  </section>
);

export default OverviewCards;
