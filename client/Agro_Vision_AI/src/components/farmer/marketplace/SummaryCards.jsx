import { motion } from "framer-motion";
import { Package, HandCoins, ShoppingCart, DollarSign, Eye, TrendingUp, TrendingDown, Minus } from "lucide-react";

const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

const fmt = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0";
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
};

const GrowthBadge = ({ value }) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400"><Minus size={11} /> 0%</span>;
  const pos = n > 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold ${pos ? "text-emerald-600" : "text-rose-600"}`}>
      {pos ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {pos ? "+" : ""}{n.toFixed(1)}%
    </span>
  );
};

const CARDS = [
  {
    key: "activeListings",
    label: "Active Listings",
    sub: "totalListings",
    subLabel: "total",
    icon: Package,
    gradient: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    format: (v) => v,
  },
  {
    key: "pendingOffers",
    label: "Pending Offers",
    sub: null,
    subLabel: "awaiting response",
    icon: HandCoins,
    gradient: "from-amber-500 to-orange-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    format: (v) => v,
  },
  {
    key: "totalOrders",
    label: "Total Orders",
    sub: null,
    subLabel: "all time",
    icon: ShoppingCart,
    gradient: "from-blue-500 to-indigo-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    format: (v) => v,
  },
  {
    key: "thisMonthEarnings",
    label: "This Month",
    sub: "earningsGrowth",
    subLabel: "vs last month",
    icon: DollarSign,
    gradient: "from-violet-500 to-purple-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-700",
    format: fmt,
    isGrowth: true,
  },
  {
    key: "totalEarnings",
    label: "Total Earnings",
    sub: null,
    subLabel: "lifetime",
    icon: TrendingUp,
    gradient: "from-rose-500 to-pink-600",
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-700",
    format: fmt,
  },
  {
    key: "totalViews",
    label: "Listing Views",
    sub: null,
    subLabel: "total impressions",
    icon: Eye,
    gradient: "from-cyan-500 to-sky-600",
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    text: "text-cyan-700",
    format: (v) => v,
  },
];

const SkeletonCard = () => (
  <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5">
    <div className="flex items-start justify-between">
      <div className="h-10 w-10 rounded-xl bg-slate-200" />
      <div className="h-4 w-16 rounded bg-slate-200" />
    </div>
    <div className="mt-4 h-7 w-24 rounded bg-slate-200" />
    <div className="mt-2 h-3 w-20 rounded bg-slate-200" />
  </div>
);

export default function SummaryCards({ summary = {}, loading = false }) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {CARDS.map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
    >
      {CARDS.map((card) => {
        const value = summary[card.key] ?? 0;
        const subValue = card.sub ? summary[card.sub] : null;
        const Icon = card.icon;

        return (
          <motion.div
            key={card.key}
            variants={fadeUp}
            whileHover={{ y: -4, scale: 1.01 }}
            className={`relative overflow-hidden rounded-2xl border ${card.border} ${card.bg} p-5 shadow-sm transition-all hover:shadow-md`}
          >
            {/* gradient accent top-right */}
            <div className={`absolute -top-6 -right-6 h-20 w-20 rounded-full bg-gradient-to-br ${card.gradient} opacity-10`} />

            <div className="flex items-start justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient} text-white shadow-sm`}>
                <Icon size={18} />
              </div>
              {card.isGrowth && subValue !== null ? (
                <GrowthBadge value={subValue} />
              ) : subValue !== null ? (
                <span className={`text-xs font-semibold ${card.text}`}>{subValue} {card.subLabel}</span>
              ) : null}
            </div>

            <p className={`mt-4 text-2xl font-black ${card.text}`}>
              {card.format(value)}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">{card.label}</p>
            {!card.isGrowth && (
              <p className="mt-0.5 text-[10px] text-slate-400">{card.subLabel}</p>
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
