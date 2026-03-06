import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  CalendarClock,
  ChartColumnIncreasing,
  CircleDollarSign,
  Clock3,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  TrendingDown,
  TrendingUp,
  Wallet
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { useAuth } from "../../context/AuthContext";

const MotionLink = motion(Link);

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (index = 1) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.08, duration: 0.45, ease: "easeOut" }
  })
};

const MARKET_BASELINE = [
  { day: "Mon", priceIndex: 78, supplyIndex: 64 },
  { day: "Tue", priceIndex: 75, supplyIndex: 68 },
  { day: "Wed", priceIndex: 81, supplyIndex: 63 },
  { day: "Thu", priceIndex: 73, supplyIndex: 71 },
  { day: "Fri", priceIndex: 76, supplyIndex: 67 },
  { day: "Sat", priceIndex: 70, supplyIndex: 74 },
  { day: "Sun", priceIndex: 74, supplyIndex: 69 }
];

const BUDGET_BASELINE = [
  { bucket: "Vegetables", planned: 58, actual: 54 },
  { bucket: "Grains", planned: 66, actual: 61 },
  { bucket: "Pulses", planned: 43, actual: 46 },
  { bucket: "Spices", planned: 52, actual: 49 }
];

const RECOMMENDED_LOTS = [
  {
    id: "LOT-402",
    name: "Premium Basmati Rice",
    category: "Grains",
    origin: "Karnal, Haryana",
    basePrice: 4680,
    availableQty: "36 tons",
    quality: "Grade A",
    confidence: 95,
    eta: "2 days"
  },
  {
    id: "LOT-327",
    name: "Export Onion Batch",
    category: "Vegetables",
    origin: "Nashik, Maharashtra",
    basePrice: 2230,
    availableQty: "42 tons",
    quality: "Premium",
    confidence: 91,
    eta: "36 hrs"
  },
  {
    id: "LOT-118",
    name: "Turmeric Fingers",
    category: "Spices",
    origin: "Erode, Tamil Nadu",
    basePrice: 12100,
    availableQty: "14 tons",
    quality: "Curcumin 4.5%",
    confidence: 93,
    eta: "3 days"
  },
  {
    id: "LOT-290",
    name: "Chana Dal Bulk",
    category: "Pulses",
    origin: "Indore, Madhya Pradesh",
    basePrice: 6220,
    availableQty: "25 tons",
    quality: "Machine Clean",
    confidence: 89,
    eta: "48 hrs"
  }
];

const ORDER_FEED = [
  {
    id: "ORD-9018",
    item: "Tomato Hybrid Crates",
    vendor: "GreenArc Produce",
    status: "In Transit",
    eta: "Today 18:30",
    progress: 72
  },
  {
    id: "ORD-9012",
    item: "Basmati Rice 1121",
    vendor: "NorthYield Foods",
    status: "Packaging",
    eta: "Tomorrow 10:15",
    progress: 48
  },
  {
    id: "ORD-8994",
    item: "Turmeric Finger Lot",
    vendor: "SpiceRoot Co",
    status: "Quality Check",
    eta: "Tomorrow 16:00",
    progress: 36
  },
  {
    id: "ORD-8981",
    item: "Chana Dal Bulk",
    vendor: "PulseKart",
    status: "Delivered",
    eta: "Completed",
    progress: 100
  }
];

const AI_BRIEFS = [
  {
    title: "Rice spread opened by 4.2% in your favor",
    detail: "Lock 40% of planned grain volume before evening settlement to protect margin volatility.",
    cta: "Secure quote window"
  },
  {
    title: "Onion freight easing on western route",
    detail: "Club two nearby suppliers into one dispatch cycle to reduce logistics cost by an estimated 6.1%.",
    cta: "Build bundled route"
  },
  {
    title: "Pulses demand spike expected in 48 hours",
    detail: "Advance reserve from Indore lots now and shift payment terms to day-15 credit for better cash flow.",
    cta: "Reserve strategic stock"
  }
];

const CATEGORY_FILTERS = ["All", "Vegetables", "Grains", "Pulses", "Spices"];

const currency = (value) => `Rs ${new Intl.NumberFormat("en-IN").format(value)}`;

const MarketTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) {
    return null;
  }

  const priceIndex = payload.find((entry) => entry.dataKey === "priceIndex")?.value;
  const supplyIndex = payload.find((entry) => entry.dataKey === "supplyIndex")?.value;

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-slate-700 mb-1">{label}</p>
      <p className="text-xs text-slate-600">Price Index: {priceIndex}</p>
      <p className="text-xs text-slate-600">Supply Index: {supplyIndex}</p>
    </div>
  );
};

const budgetTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) {
    return null;
  }

  const planned = payload.find((entry) => entry.dataKey === "planned")?.value;
  const actual = payload.find((entry) => entry.dataKey === "actual")?.value;

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-slate-700 mb-1">{label}</p>
      <p className="text-xs text-slate-600">Planned: {planned}L</p>
      <p className="text-xs text-slate-600">Actual: {actual}L</p>
    </div>
  );
};

const statusTone = (status) => {
  if (status === "Delivered") {
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  }

  if (status === "In Transit") {
    return "bg-sky-100 text-sky-700 border-sky-200";
  }

  if (status === "Packaging") {
    return "bg-amber-100 text-amber-700 border-amber-200";
  }

  return "bg-violet-100 text-violet-700 border-violet-200";
};

const BuyerDashboard = () => {
  const { user } = useAuth();

  const [liveTick, setLiveTick] = useState(0);
  const [briefIndex, setBriefIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    const pulseTimer = setInterval(() => {
      setLiveTick((prev) => prev + 1);
      setLastUpdated(new Date());
    }, 8500);

    return () => clearInterval(pulseTimer);
  }, []);

  useEffect(() => {
    const briefTimer = setInterval(() => {
      setBriefIndex((prev) => prev + 1);
    }, 5600);

    return () => clearInterval(briefTimer);
  }, []);

  const buyerName = user?.name ? user.name.split(" ")[0] : "Buyer";

  const marketData = useMemo(() => {
    return MARKET_BASELINE.map((point, index) => {
      const priceDrift = Math.sin((liveTick + index + 1) * 0.57) * 3.4;
      const supplyDrift = Math.cos((liveTick + index + 1) * 0.46) * 4.2;

      return {
        ...point,
        priceIndex: Math.round(point.priceIndex + priceDrift),
        supplyIndex: Math.round(point.supplyIndex + supplyDrift)
      };
    });
  }, [liveTick]);

  const budgetData = useMemo(() => {
    return BUDGET_BASELINE.map((point, index) => {
      const utilizationWave = Math.sin((liveTick + index + 1) * 0.74) * 1.8;

      return {
        ...point,
        actual: Number((point.actual + utilizationWave).toFixed(1))
      };
    });
  }, [liveTick]);

  const lots = useMemo(() => {
    return RECOMMENDED_LOTS.map((lot, index) => {
      const pulse = Math.sin((liveTick + index + 1) * 0.63) * 0.028;
      const livePrice = Math.round(lot.basePrice * (1 + pulse));
      const priceDelta = Number((((livePrice - lot.basePrice) / lot.basePrice) * 100).toFixed(1));

      return {
        ...lot,
        livePrice,
        priceDelta
      };
    });
  }, [liveTick]);

  const visibleLots = useMemo(() => {
    if (selectedCategory === "All") {
      return lots;
    }

    return lots.filter((lot) => lot.category === selectedCategory);
  }, [lots, selectedCategory]);

  const topLot = useMemo(() => {
    const ranked = [...lots].sort(
      (left, right) =>
        right.confidence + right.priceDelta - (left.confidence + left.priceDelta)
    );

    return ranked[0] ?? lots[0];
  }, [lots]);

  const orders = useMemo(() => {
    return ORDER_FEED.map((order, index) => {
      const progressJump = Math.round(Math.sin((liveTick + index + 1) * 0.7) * 5 + 5);
      const progress = Math.min(100, order.progress + Math.max(0, progressJump));

      return {
        ...order,
        progress,
        status: progress >= 100 ? "Delivered" : order.status
      };
    });
  }, [liveTick]);

  const pendingOrders = orders.filter((order) => order.status !== "Delivered").length;
  const onTimeRate = Math.max(89, Math.min(99, 94 + Math.round(Math.cos(liveTick * 0.61) * 2)));
  const avgLeadHours = Math.max(9, 13 + Math.round(Math.sin(liveTick * 0.53) * 2));
  const monthlySpend = 248000 + Math.round(Math.sin(liveTick * 0.52) * 9600);
  const smartSavings = Math.round(monthlySpend * 0.11);
  const supplierTrust = Math.max(90, Math.min(98, 94 + Math.round(Math.cos(liveTick * 0.72) * 2)));
  const priceAdvantage = Math.max(4.5, Number((6.8 + Math.sin(liveTick * 0.5) * 1.7).toFixed(1)));
  const activeBrief = AI_BRIEFS[briefIndex % AI_BRIEFS.length];
  const nextSync = 15 - (liveTick % 15);

  const kpis = [
    {
      icon: Wallet,
      label: "Procurement Spend",
      value: currency(monthlySpend),
      helper: "Current month",
      positive: true
    },
    {
      icon: CircleDollarSign,
      label: "Smart Savings",
      value: currency(smartSavings),
      helper: "AI optimized buys",
      positive: true
    },
    {
      icon: PackageCheck,
      label: "Open Orders",
      value: String(pendingOrders).padStart(2, "0"),
      helper: `${avgLeadHours}h avg lead time`,
      positive: pendingOrders <= 4
    },
    {
      icon: BadgeCheck,
      label: "On-Time Delivery",
      value: `${onTimeRate}%`,
      helper: "Rolling 30-day accuracy",
      positive: onTimeRate >= 93
    }
  ];

  const quickActions = [
    { label: "Open Marketplace", path: "/buyer/marketplace", icon: Store },
    { label: "Track Orders", path: "/buyer/orders", icon: PackageCheck },
    { label: "Supplier Profile", path: "/buyer/profile", icon: ShieldCheck }
  ];

  return (
    <div
      className="relative isolate min-h-screen overflow-hidden bg-[linear-gradient(145deg,#fff8e7_0%,#effcf4_42%,#e9f4ff_100%)] py-6 sm:py-8"
      style={{ fontFamily: "'Space Grotesk', 'Segoe UI', sans-serif" }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ x: [0, 36, 0], y: [0, -24, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-16 top-6 h-72 w-72 rounded-full bg-amber-300/30 blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -28, 0], y: [0, 22, 0] }}
          transition={{ duration: 17, repeat: Infinity, ease: "easeInOut" }}
          className="absolute right-0 top-28 h-72 w-72 rounded-full bg-teal-300/30 blur-3xl"
        />
        <motion.div
          animate={{ x: [0, 25, 0], y: [0, -18, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-1/3 bottom-0 h-80 w-80 rounded-full bg-sky-300/30 blur-3xl"
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="overflow-hidden rounded-[28px] border border-[#153047]/10 shadow-[0_24px_90px_-45px_rgba(21,48,71,0.65)]"
        >
          <div className="relative bg-[linear-gradient(120deg,#0f3a4c_0%,#0f766e_42%,#f59e0b_130%)] p-5 sm:p-8 text-white">
            <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.55)_1px,transparent_0)] bg-size-[20px_20px]" />

            <div className="relative grid gap-6 lg:grid-cols-3 lg:items-start">
              <div className="lg:col-span-2 space-y-4">
                <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs tracking-[0.14em] uppercase">
                  <ShoppingBag size={14} />
                  Buyer Command Deck
                </p>

                <h1
                  className="text-3xl sm:text-4xl lg:text-5xl leading-tight"
                  style={{ fontFamily: "'Bricolage Grotesque', 'Space Grotesk', sans-serif" }}
                >
                  Hello {buyerName}, purchase smarter,
                  <br />
                  move faster, and protect margins daily.
                </h1>

                <p className="max-w-2xl text-sm sm:text-base text-teal-50/95">
                  A real-time buyer cockpit for market pulse, supplier trust, procurement planning, and
                  AI-generated negotiation timing.
                </p>

                <div className="grid gap-2 sm:grid-cols-3 text-xs sm:text-sm">
                  <p className="inline-flex items-center gap-2 rounded-xl bg-white/12 px-3 py-2">
                    <CalendarClock size={14} />
                    Next sync in {nextSync} min
                  </p>
                  <p className="inline-flex items-center gap-2 rounded-xl bg-white/12 px-3 py-2">
                    <BellRing size={14} />
                    Supplier pings: {12 + (liveTick % 8)}
                  </p>
                  <p className="inline-flex items-center gap-2 rounded-xl bg-white/12 px-3 py-2">
                    <Clock3 size={14} />
                    Last update {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {quickActions.map((action) => (
                    <MotionLink
                      key={action.label}
                      to={action.path}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/12 px-4 py-2 text-sm hover:bg-white/20 transition"
                    >
                      <action.icon size={16} />
                      {action.label}
                    </MotionLink>
                  ))}
                </div>
              </div>

              <motion.div
                custom={1}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="rounded-2xl border border-white/25 bg-white/12 p-4 backdrop-blur-sm"
              >
                <p className="text-xs uppercase tracking-[0.12em] text-teal-50/90 mb-2">Best Buy Window</p>
                <h2 className="text-xl font-semibold leading-tight mb-1">{topLot?.name}</h2>
                <p className="text-sm text-teal-50/90 mb-4">{topLot?.origin}</p>

                <div className="grid gap-2 text-sm">
                  <div className="flex items-center justify-between rounded-lg bg-black/15 px-3 py-2">
                    <span>Live price</span>
                    <span className="font-semibold">{currency(topLot?.livePrice ?? 0)}/qtl</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-black/15 px-3 py-2">
                    <span>Confidence</span>
                    <span className="font-semibold">{topLot?.confidence ?? 0}%</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-black/15 px-3 py-2">
                    <span>Market edge</span>
                    <span className="font-semibold">+{priceAdvantage}%</span>
                  </div>
                </div>

                <MotionLink
                  to="/buyer/marketplace"
                  whileHover={{ x: 2 }}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-amber-100"
                >
                  Lock this opportunity
                  <ArrowRight size={15} />
                </MotionLink>
              </motion.div>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
        >
          {kpis.map((card, index) => (
            <KpiCard key={card.label} card={card} index={index + 1} />
          ))}
        </motion.section>

        <section className="grid gap-6 xl:grid-cols-3">
          <motion.article
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="xl:col-span-2 rounded-3xl border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur-sm"
          >
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900 inline-flex items-center gap-2">
                  <ChartColumnIncreasing size={18} className="text-teal-700" />
                  Market Movement Intelligence
                </h2>
                <p className="text-sm text-slate-500">Price vs supply index across the latest weekly cycle</p>
              </div>

              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                Advantage window: +{priceAdvantage}%
              </div>
            </div>

            <div className="h-70 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={marketData} margin={{ top: 12, right: 16, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="priceGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0f766e" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#0f766e" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="supplyGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#dbe3ed" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis domain={[52, 92]} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip content={<MarketTooltip />} />

                  <Area
                    type="monotone"
                    dataKey="priceIndex"
                    stroke="#0f766e"
                    fill="url(#priceGlow)"
                    strokeWidth={2.2}
                    activeDot={{ r: 4 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="supplyIndex"
                    stroke="#f59e0b"
                    fill="url(#supplyGlow)"
                    strokeWidth={2}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-teal-700" />
                Price Index
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Supply Index
              </span>
            </div>
          </motion.article>

          <motion.article
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="rounded-3xl border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur-sm"
          >
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Budget Discipline</h2>
            <p className="text-sm text-slate-500 mb-4">Planned vs actual spend by category (in Lakh)</p>

            <div className="h-72.5">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="bucket" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} />
                  <Tooltip content={budgetTooltip} />
                  <Bar dataKey="planned" radius={[6, 6, 0, 0]} fill="#93c5fd" />
                  <Bar dataKey="actual" radius={[6, 6, 0, 0]} fill="#0f766e" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 space-y-2 text-xs text-slate-600">
              <p className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-sky-300" />
                Planned
              </p>
              <p className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-teal-700" />
                Actual
              </p>
            </div>
          </motion.article>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <motion.article
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="xl:col-span-2 rounded-3xl border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur-sm"
          >
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900">AI Curated Buy Lots</h2>
                <p className="text-sm text-slate-500">Shortlisted by reliability, price efficiency, and delivery confidence</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {CATEGORY_FILTERS.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setSelectedCategory(filter)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      selectedCategory === filter
                        ? "border-teal-600 bg-teal-600 text-white"
                        : "border-slate-300 bg-white text-slate-600 hover:border-teal-400"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {visibleLots.map((lot) => (
                <motion.article
                  key={lot.id}
                  whileHover={{ y: -3, scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-500">{lot.id}</p>
                      <h3 className="text-base font-semibold text-slate-900">{lot.name}</h3>
                      <p className="text-sm text-slate-500">{lot.origin}</p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${
                        lot.priceDelta <= 0
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-amber-300 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {lot.priceDelta <= 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                      {Math.abs(lot.priceDelta)}%
                    </span>
                  </div>

                  <div className="mb-4 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-lg bg-slate-50 px-2 py-2">
                      <p className="text-slate-500">Price</p>
                      <p className="font-semibold text-slate-800">{currency(lot.livePrice)}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-2 py-2">
                      <p className="text-slate-500">Stock</p>
                      <p className="font-semibold text-slate-800">{lot.availableQty}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-2 py-2">
                      <p className="text-slate-500">ETA</p>
                      <p className="font-semibold text-slate-800">{lot.eta}</p>
                    </div>
                  </div>

                  <div className="mb-4 flex items-center justify-between text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1">
                      <Sparkles size={12} />
                      {lot.quality}
                    </span>
                    <span className="font-medium">Confidence {lot.confidence}%</span>
                  </div>

                  <MotionLink
                    to="/buyer/marketplace"
                    whileHover={{ x: 2 }}
                    className="inline-flex items-center gap-2 text-sm font-medium text-teal-700"
                  >
                    Lock best quote
                    <ArrowRight size={14} />
                  </MotionLink>
                </motion.article>
              ))}
            </div>
          </motion.article>

          <motion.article
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="rounded-3xl border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur-sm"
          >
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Fulfillment Radar</h2>

            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-slate-500">{order.id}</p>
                      <p className="text-sm font-medium text-slate-800">{order.item}</p>
                    </div>

                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusTone(order.status)}`}
                    >
                      {order.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mb-2">{order.vendor} · {order.eta}</p>

                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-teal-500 to-cyan-500"
                      style={{ width: `${order.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-amber-900 mb-2">
                <Sparkles size={15} />
                Negotiation AI Brief
              </p>

              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeBrief.title}-${briefIndex}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <p className="text-sm font-semibold text-slate-800">{activeBrief.title}</p>
                  <p className="mt-1 text-xs text-slate-700">{activeBrief.detail}</p>
                  <p className="mt-2 text-xs font-medium text-amber-900">{activeBrief.cta}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="text-slate-600 mb-1">Supplier Trust Index</p>
              <p className="text-2xl font-semibold text-slate-900">{supplierTrust}%</p>
              <p className="text-xs text-slate-500">Derived from quality consistency, delivery discipline, and dispute history.</p>
            </div>
          </motion.article>
        </section>
      </div>
    </div>
  );
};

const KpiCard = ({ card, index }) => {
  return (
    <motion.article
      custom={index}
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      className="rounded-2xl border border-slate-200/80 bg-white/85 p-4 shadow-sm backdrop-blur-sm"
    >
      <div className="mb-3 inline-flex rounded-lg bg-slate-100 p-2 text-slate-700">
        <card.icon size={18} />
      </div>

      <p className="text-xs uppercase tracking-[0.09em] text-slate-500">{card.label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{card.value}</p>
      <p className={`mt-1 text-xs ${card.positive ? "text-emerald-600" : "text-amber-600"}`}>{card.helper}</p>
    </motion.article>
  );
};

export default BuyerDashboard;
