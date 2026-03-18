import React, { useCallback, useEffect, useState } from "react";
import useOfferSocket from "../../hooks/useOfferSocket";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  BadgeIndianRupee,
  BarChart3,
  Brain,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  Eye,
  FileText,
  Filter,
  Flame,
  HandCoins,
  Layers,
  Leaf,
  Loader2,
  MapPin,
  MessageSquare,
  Minus,
  Package,
  PauseCircle,
  Pencil,
  RefreshCcw,
  Search,
  ShoppingCart,
  Sparkles,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  Wheat,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useNavigate } from "react-router-dom";
import SellCropForm from "../../components/farmer/SellCropForm";
import {
  getMyListings,
  deleteCropListing,
  pauseCropListing,
  getFarmerOffers,
  respondToOffer,
  createOrderFromOffer,
  getFarmerOrders,
  updateOrderStatus,
  getSalesAnalytics,
  discoverBuyers,
  getHarvestInsights,
  getDemandIndicators,
  getAIPriceSuggestion,
  getAIDemandPrediction,
} from "../../api/marketplaceApi";

/* ─── Constants ───────────────────────────────────────────────────── */

const TABS = [
  { key: "sell", label: "Sell Crop", icon: Sparkles },
  { key: "listings", label: "My Listings", icon: Layers },
  { key: "offers", label: "Offers", icon: HandCoins },
  { key: "orders", label: "Orders", icon: ShoppingCart },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "discover", label: "Discover", icon: Users },
];

const ORDER_STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  confirmed: "bg-blue-100 text-blue-700 border-blue-200",
  processing: "bg-indigo-100 text-indigo-700 border-indigo-200",
  shipped: "bg-violet-100 text-violet-700 border-violet-200",
  delivered: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-100 text-rose-700 border-rose-200",
};

const OFFER_STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  accepted: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-100 text-rose-700 border-rose-200",
  negotiating: "bg-blue-100 text-blue-700 border-blue-200",
  expired: "bg-slate-100 text-slate-500 border-slate-200",
};

/* ─── Animations ──────────────────────────────────────────────────── */

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.03 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } },
};
const cardHover = { y: -3, transition: { duration: 0.18, ease: "easeOut" } };

/* ─── Helpers ─────────────────────────────────────────────────────── */

const formatINR = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "₹0";
  return `₹${new Intl.NumberFormat("en-IN").format(Math.round(n))}`;
};

const StatusBadge = ({ status, map }) => {
  const cls = map[status] || "bg-slate-100 text-slate-500 border-slate-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold capitalize ${cls}`}>
      {status}
    </span>
  );
};

const DemandBadge = ({ level }) => {
  const styles = { High: "bg-emerald-100 text-emerald-700", Medium: "bg-amber-100 text-amber-700", Low: "bg-rose-100 text-rose-700" };
  const dots = { High: "🟢", Medium: "🟡", Low: "🔴" };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${styles[level] || styles.Medium}`}>
      {dots[level] || "🟡"} {level || "Medium"}
    </span>
  );
};

const GlassCard = ({ children, className = "", ...props }) => (
  <motion.div
    variants={fadeUp}
    whileHover={cardHover}
    className={`rounded-2xl border border-white/40 bg-white/70 p-5 shadow-lg shadow-black/4 backdrop-blur-md ${className}`}
    {...props}
  >
    {children}
  </motion.div>
);

const SectionTitle = ({ icon, title, subtitle }) => (
  <div className="mb-4">
    <h2 className="inline-flex items-center gap-2 text-lg font-extrabold text-slate-800">
      {React.createElement(icon, { size: 18, className: "text-emerald-600" })}
      {title}
    </h2>
    {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
  </div>
);

const SkeletonBlock = ({ className = "h-40" }) => (
  <div className={`animate-pulse rounded-2xl bg-slate-200/60 ${className}`} />
);

/* ═══════════════════════════════════════════════════════════════════ */
/*  Main Component                                                    */
/* ═══════════════════════════════════════════════════════════════════ */

const SellCrop = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("sell");
  const [loading, setLoading] = useState(false);

  /* ─── Harvest Insights ───────────────────────────────────────────── */
  const [harvestCrop, setHarvestCrop] = useState("Wheat");
  const [harvest, setHarvest] = useState(null);
  const [aiRecommendation, setAiRecommendation] = useState(null);

  /* ─── Listings ───────────────────────────────────────────────────── */
  const [listings, setListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(false);

  /* ─── Offers ─────────────────────────────────────────────────────── */
  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(false);

  /* ─── Orders ─────────────────────────────────────────────────────── */
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  /* ─── Analytics ──────────────────────────────────────────────────── */
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  /* ─── Discovery ──────────────────────────────────────────────────── */
  const [buyers, setBuyers] = useState([]);
  const [demandIndicators, setDemandIndicators] = useState([]);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState("");

  /* ─── Real-time socket refresh ──────────────────────────────────── */
  useOfferSocket({
    new_offer: () => {
      if (activeTab === "offers") fetchOffers();
      else setOffers((prev) => prev); // trigger badge update on next tab open
    },
    offer_responded: () => { if (activeTab === "offers") fetchOffers(); },
    new_order: () => { if (activeTab === "orders") fetchOrders(); },
    order_paid: () => { if (activeTab === "orders") fetchOrders(); },
    crop_price_update: ({ cropId, price }) => {
      setListings((prev) =>
        prev.map((l) =>
          (l._id?.toString() ?? l.id) === cropId ? { ...l, price } : l
        )
      );
    },
  });

  /* ─── Fetch Helpers ──────────────────────────────────────────────── */

  const fetchHarvest = useCallback(async (crop) => {
    try {
      const data = await getHarvestInsights({ crop });
      setHarvest(data);
    } catch { setHarvest(null); }
  }, []);

  const fetchAIRecommendation = useCallback(async (crop) => {
    try {
      const [priceRes, demandRes] = await Promise.allSettled([
        getAIPriceSuggestion({ crop, quantity: 50, location: "Ahmedabad", demand: "MEDIUM" }),
        getAIDemandPrediction({ crop, location: "Ahmedabad" }),
      ]);
      setAiRecommendation({
        price: priceRes.status === "fulfilled" ? priceRes.value : null,
        demand: demandRes.status === "fulfilled" ? demandRes.value : null,
      });
    } catch { setAiRecommendation(null); }
  }, []);

  const fetchListings = useCallback(async () => {
    setListingsLoading(true);
    try {
      const data = await getMyListings();
      setListings(data.listings || []);
    } catch { setListings([]); }
    setListingsLoading(false);
  }, []);

  const fetchOffers = useCallback(async () => {
    setOffersLoading(true);
    try {
      const data = await getFarmerOffers();
      setOffers(data.offers || []);
    } catch { setOffers([]); }
    setOffersLoading(false);
  }, []);

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const data = await getFarmerOrders();
      setOrders(data.orders || []);
    } catch { setOrders([]); }
    setOrdersLoading(false);
  }, []);

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const data = await getSalesAnalytics();
      setAnalytics(data);
    } catch { setAnalytics(null); }
    setAnalyticsLoading(false);
  }, []);

  const fetchDiscovery = useCallback(async () => {
    setDiscoveryLoading(true);
    try {
      const [buyersRes, demandRes] = await Promise.allSettled([
        discoverBuyers({ crop: harvestCrop }),
        getDemandIndicators(),
      ]);
      if (buyersRes.status === "fulfilled") setBuyers(buyersRes.value.buyers || []);
      if (demandRes.status === "fulfilled") setDemandIndicators(demandRes.value.indicators || []);
    } catch { /* ignore */ }
    setDiscoveryLoading(false);
  }, [harvestCrop]);

  /* ─── Tab Data Loading ───────────────────────────────────────────── */

  useEffect(() => {
    fetchHarvest(harvestCrop);
    fetchAIRecommendation(harvestCrop);
  }, [harvestCrop, fetchHarvest, fetchAIRecommendation]);

  useEffect(() => {
    if (activeTab === "listings") fetchListings();
    else if (activeTab === "offers") fetchOffers();
    else if (activeTab === "orders") fetchOrders();
    else if (activeTab === "analytics") fetchAnalytics();
    else if (activeTab === "discover") fetchDiscovery();
  }, [activeTab, fetchListings, fetchOffers, fetchOrders, fetchAnalytics, fetchDiscovery]);

  /* ─── Actions ────────────────────────────────────────────────────── */

  const handleDeleteListing = async (id) => {
    setActionLoading(`del-${id}`);
    try { await deleteCropListing(id); await fetchListings(); } catch { /* ignore */ }
    setActionLoading("");
  };

  const handlePauseListing = async (id) => {
    setActionLoading(`pause-${id}`);
    try { await pauseCropListing(id); await fetchListings(); } catch { /* ignore */ }
    setActionLoading("");
  };

  const handleOfferRespond = async (offerId, action) => {
    setActionLoading(`offer-${offerId}`);
    try {
      await respondToOffer(offerId, { action });
      if (action === "accept") {
        try { await createOrderFromOffer(offerId); } catch { /* order creation is best-effort */ }
      }
      await fetchOffers();
    } catch { /* ignore */ }
    setActionLoading("");
  };

  const handleOrderStatusUpdate = async (orderId, status) => {
    setActionLoading(`order-${orderId}`);
    try { await updateOrderStatus(orderId, status); await fetchOrders(); } catch { /* ignore */ }
    setActionLoading("");
  };

  /* ═══════════════════════════════════════════════════════════════════ */

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-emerald-50/30 to-blue-50/20 px-4 py-6 sm:px-6 lg:px-8">
      <motion.div className="mx-auto max-w-7xl space-y-5" variants={stagger} initial="hidden" animate="visible">

        {/* ── 1. Smart Harvest Selling Header ──────────────────────── */}
        <motion.section
          variants={fadeUp}
          className="overflow-hidden rounded-3xl border border-emerald-200/60 bg-linear-to-br from-emerald-700 via-emerald-800 to-teal-900 p-6 text-white shadow-2xl shadow-emerald-900/25 sm:p-8"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest backdrop-blur-sm">
                <Sparkles size={13} /> Smart Sell Studio
              </div>
              <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
                Intelligent Crop Marketplace
              </h1>
              <p className="mt-2 max-w-xl text-sm text-emerald-100/90 sm:text-base">
                List crops, get AI price suggestions, receive buyer offers, and manage sales — all in one place.
              </p>
            </div>
            <motion.button
              type="button"
              onClick={() => navigate("/farmer/marketplace")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              <ArrowLeft size={15} /> Market Intelligence
            </motion.button>
          </div>

          {/* Harvest Insight Cards */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="mr-2 text-xs font-bold uppercase tracking-widest text-emerald-200/70">Analyzing:</span>
            {["Wheat", "Rice", "Cotton", "Tomato", "Maize"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setHarvestCrop(c)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${harvestCrop === c ? "bg-white/25 text-white" : "bg-white/8 text-white/70 hover:bg-white/15"}`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <motion.div className="rounded-xl border border-white/25 bg-white/10 p-3.5 backdrop-blur-sm" whileHover={{ y: -2 }}>
              <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-200/80">
                <Wheat size={12} className="mr-1 inline" /> Harvest Ready
              </p>
              <p className="mt-1.5 text-lg font-black">{harvest?.crop || harvestCrop}</p>
              <p className="text-xs text-emerald-200/70">{harvest?.harvestReady ? "✅ Ready to sell" : "Preparing..."}</p>
            </motion.div>
            <motion.div className="rounded-xl border border-white/25 bg-white/10 p-3.5 backdrop-blur-sm" whileHover={{ y: -2 }}>
              <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-200/80">
                <BadgeIndianRupee size={12} className="mr-1 inline" /> Market Price
              </p>
              <p className="mt-1.5 text-lg font-black">{formatINR(harvest?.marketPrice || 0)}/qtl</p>
              <DemandBadge level={harvest?.demand} />
            </motion.div>
            <motion.div className="rounded-xl border border-white/25 bg-white/10 p-3.5 backdrop-blur-sm" whileHover={{ y: -2 }}>
              <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-200/80">
                <Brain size={12} className="mr-1 inline" /> AI Suggested Price
              </p>
              <p className="mt-1.5 text-lg font-black">{formatINR(harvest?.aiSuggestedPrice || 0)}/qtl</p>
              {harvest?.aiSuggestedPrice > harvest?.marketPrice ? (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-200"><ArrowUpRight size={11} /> Above market</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-amber-200"><ArrowDownRight size={11} /> At market</span>
              )}
            </motion.div>
            <motion.div className="rounded-xl border border-white/25 bg-white/10 p-3.5 backdrop-blur-sm" whileHover={{ y: -2 }}>
              <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-200/80">
                <MapPin size={12} className="mr-1 inline" /> Best Market
              </p>
              <p className="mt-1.5 text-lg font-black">{harvest?.bestMarket || "Ahmedabad"}</p>
              <p className="text-xs text-emerald-200/70">Top selling location</p>
            </motion.div>
          </div>
        </motion.section>

        {/* ── Tab Navigation ───────────────────────────────────────── */}
        <motion.nav variants={fadeUp} className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-200/60 bg-white/60 p-1.5 backdrop-blur-sm">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === tab.key
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {React.createElement(tab.icon, { size: 15 })} {tab.label}
            </button>
          ))}
        </motion.nav>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB: Sell Crop                                             */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === "sell" && (
          <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-5">

            {/* AI Recommended Price + Profit Panel */}
            {aiRecommendation?.price && (
              <motion.div variants={fadeUp} className="grid gap-5 lg:grid-cols-2">
                {/* AI Recommendation */}
                <GlassCard>
                  <SectionTitle icon={Brain} title="AI Recommended Selling Price" subtitle="AI calculates best selling price for your crop" />
                  <div className="space-y-3">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Recommended Price</p>
                      <p className="mt-1 text-3xl font-black text-emerald-800">
                        {formatINR(aiRecommendation.price.suggested_price)}<span className="text-base font-semibold text-emerald-600">/ kg</span>
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
                        <p className="text-[10px] font-bold uppercase text-slate-500">Market Price</p>
                        <p className="text-sm font-black text-slate-700">{formatINR(harvest?.marketPrice || 0)}/qtl</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
                        <p className="text-[10px] font-bold uppercase text-slate-500">Demand</p>
                        <DemandBadge level={aiRecommendation.price.demand_level === "HIGH" ? "High" : aiRecommendation.price.demand_level === "LOW" ? "Low" : "Medium"} />
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
                        <p className="text-[10px] font-bold uppercase text-slate-500">Confidence</p>
                        <p className="text-sm font-black text-blue-700">{aiRecommendation.price.confidence}%</p>
                      </div>
                    </div>
                    <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">
                      💡 {aiRecommendation.price.demand_level === "HIGH"
                        ? "High demand detected. Selling above market price recommended."
                        : aiRecommendation.price.demand_level === "LOW"
                          ? "Low demand. Consider waiting or exploring other markets."
                          : "Moderate demand. Selling at AI recommended price is reasonable."}
                    </p>
                  </div>
                </GlassCard>

                {/* Profit Estimation */}
                <GlassCard>
                  <SectionTitle icon={DollarSign} title="Profit Estimation" subtitle="Automatic profit calculation for your crop" />
                  {(() => {
                    const prodCosts = { wheat: 1800, rice: 2000, cotton: 4200, maize: 1500, tomato: 1200 };
                    const prodCost = prodCosts[harvestCrop.toLowerCase()] || 1800;
                    const aiPrice = harvest?.aiSuggestedPrice || 0;
                    const profit = aiPrice - prodCost;
                    const margin = aiPrice > 0 ? ((profit / aiPrice) * 100).toFixed(1) : 0;

                    return (
                      <div className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Production Cost</p>
                            <p className="mt-2 text-2xl font-black text-slate-700">{formatINR(prodCost)}<span className="text-sm font-medium text-slate-400">/qtl</span></p>
                          </div>
                          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-center">
                            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">AI Selling Price</p>
                            <p className="mt-2 text-2xl font-black text-blue-800">{formatINR(aiPrice)}<span className="text-sm font-medium text-blue-400">/qtl</span></p>
                          </div>
                        </div>
                        <div className={`rounded-xl border p-4 text-center ${profit >= 0 ? "border-emerald-200 bg-emerald-50/70" : "border-rose-200 bg-rose-50/70"}`}>
                          <p className={`text-xs font-bold uppercase tracking-widest ${profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>Estimated Profit</p>
                          <p className={`mt-2 text-3xl font-black ${profit >= 0 ? "text-emerald-800" : "text-rose-800"}`}>
                            {formatINR(profit)}<span className="text-sm font-medium opacity-60">/qtl</span>
                          </p>
                          <p className="mt-1 text-xs text-slate-500">Margin: {margin}%</p>
                        </div>
                        <p className="text-xs text-slate-400 text-center">
                          Based on {harvestCrop} average production costs and AI suggested selling price.
                        </p>
                      </div>
                    );
                  })()}
                </GlassCard>
              </motion.div>
            )}

            {/* AI Selling Advisor */}
            {aiRecommendation?.demand && (
              <motion.section variants={fadeUp}>
                <GlassCard className="border-indigo-200/40 bg-indigo-50/30">
                  <SectionTitle icon={Zap} title="AI Selling Advisor" subtitle="Smart recommendations on when and where to sell" />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-center">
                      <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Demand Score</p>
                      <p className="mt-2 text-2xl font-black text-emerald-800">{aiRecommendation.demand.demand_score || "—"}</p>
                      <DemandBadge level={aiRecommendation.demand.demand_level === "HIGH" ? "High" : aiRecommendation.demand.demand_level === "LOW" ? "Low" : "Medium"} />
                    </div>
                    <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-center">
                      <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Expected Price</p>
                      <p className="mt-2 text-2xl font-black text-blue-800">{formatINR(aiRecommendation.demand.expected_price || 0)}/kg</p>
                      <p className="text-xs text-blue-500">Next 7 days</p>
                    </div>
                    <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-4 text-center">
                      <p className="text-xs font-bold uppercase tracking-widest text-violet-600">Action</p>
                      <p className="mt-2 text-lg font-black text-violet-800">
                        {Number(aiRecommendation.demand.demand_score) >= 70 ? "🟢 Sell Now" : Number(aiRecommendation.demand.demand_score) >= 45 ? "🟡 Fair Price" : "🔴 Wait"}
                      </p>
                      <p className="text-xs text-violet-500">
                        {Number(aiRecommendation.demand.demand_score) >= 70
                          ? `${harvestCrop} price favorable — sell now.`
                          : Number(aiRecommendation.demand.demand_score) >= 45
                            ? "Market is stable. Selling is reasonable."
                            : `${harvestCrop} price expected to improve. Wait a few days.`}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </motion.section>
            )}

            {/* Sell Crop Form */}
            <motion.section variants={fadeUp}>
              <SellCropForm
                defaultLocation="Surat, Gujarat"
                onCreated={() => { setActiveTab("listings"); fetchListings(); }}
              />
            </motion.section>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB: My Listings                                           */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === "listings" && (
          <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-5">
            <motion.section variants={fadeUp}>
              <GlassCard>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <SectionTitle icon={Layers} title="Active Listings Dashboard" subtitle="Manage your current crop listings" />
                  <button type="button" onClick={fetchListings} className="inline-flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200">
                    <RefreshCcw size={13} /> Refresh
                  </button>
                </div>

                {listingsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <SkeletonBlock key={i} className="h-20" />)}
                  </div>
                ) : listings.length === 0 ? (
                  <div className="py-12 text-center">
                    <Package size={40} className="mx-auto text-slate-300" />
                    <p className="mt-3 text-sm text-slate-400">No listings yet. Go to Sell Crop tab to create one.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-160 text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                          <th className="px-3 py-3">Crop</th>
                          <th className="px-3 py-3">Quantity</th>
                          <th className="px-3 py-3">Price</th>
                          <th className="px-3 py-3">Location</th>
                          <th className="px-3 py-3">Status</th>
                          <th className="px-3 py-3">Views</th>
                          <th className="px-3 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {listings.map((listing) => (
                          <motion.tr
                            key={listing._id}
                            className="border-b border-slate-100 text-slate-700 transition hover:bg-emerald-50/30"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                          >
                            <td className="px-3 py-3 font-semibold">{listing.cropName}</td>
                            <td className="px-3 py-3">{listing.quantity} {listing.quantityUnit}</td>
                            <td className="px-3 py-3 font-bold">{formatINR(listing.price)}/{listing.quantityUnit}</td>
                            <td className="px-3 py-3 text-xs">
                              <MapPin size={11} className="mr-1 inline text-slate-400" />
                              {listing.location?.city || "—"}, {listing.location?.state || ""}
                            </td>
                            <td className="px-3 py-3">
                              <StatusBadge status={listing.status || "active"} map={{ active: "bg-emerald-100 text-emerald-700 border-emerald-200", sold: "bg-blue-100 text-blue-700 border-blue-200", expired: "bg-slate-100 text-slate-500 border-slate-200" }} />
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Eye size={11} /> {listing.views || 0}</span>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handlePauseListing(listing._id)}
                                  disabled={actionLoading === `pause-${listing._id}`}
                                  className="rounded-lg border border-amber-200 bg-amber-50 p-1.5 text-amber-600 hover:bg-amber-100 disabled:opacity-50"
                                  title="Pause"
                                >
                                  {actionLoading === `pause-${listing._id}` ? <Loader2 size={13} className="animate-spin" /> : <PauseCircle size={13} />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteListing(listing._id)}
                                  disabled={actionLoading === `del-${listing._id}`}
                                  className="rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                                  title="Delete"
                                >
                                  {actionLoading === `del-${listing._id}` ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </GlassCard>
            </motion.section>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB: Offers                                                */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === "offers" && (
          <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-5">
            <motion.section variants={fadeUp}>
              <GlassCard>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <SectionTitle icon={HandCoins} title="Buyer Offers" subtitle="Review and respond to buyer offers on your listings" />
                  <button type="button" onClick={fetchOffers} className="inline-flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200">
                    <RefreshCcw size={13} /> Refresh
                  </button>
                </div>

                {offersLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <SkeletonBlock key={i} className="h-28" />)}
                  </div>
                ) : offers.length === 0 ? (
                  <div className="py-12 text-center">
                    <HandCoins size={40} className="mx-auto text-slate-300" />
                    <p className="mt-3 text-sm text-slate-400">No buyer offers yet. Offers will appear when buyers bid on your listings.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {offers.map((offer) => (
                      <motion.div
                        key={offer._id}
                        className="rounded-xl border border-slate-200 bg-white p-4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -2 }}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-slate-800">
                              <Users size={14} className="mr-1.5 inline text-blue-500" />
                              {offer.buyerName || offer.buyer?.name || "Buyer"}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              Crop: <span className="font-semibold">{offer.cropListing?.cropName || "—"}</span>
                            </p>
                            <div className="mt-2 flex flex-wrap gap-3 text-sm">
                              <span className="rounded-lg bg-blue-50 px-2.5 py-1 font-bold text-blue-700">
                                Offer: {formatINR(offer.offerPrice)}/{offer.quantityUnit}
                              </span>
                              <span className="rounded-lg bg-slate-50 px-2.5 py-1 text-slate-600">
                                Qty: {offer.quantity} {offer.quantityUnit}
                              </span>
                              <StatusBadge status={offer.status} map={OFFER_STATUS_COLORS} />
                            </div>
                            {offer.message && (
                              <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                                <MessageSquare size={11} className="mr-1 inline" /> &quot;{offer.message}&quot;
                              </p>
                            )}
                            {offer.counterPrice && (
                              <p className="mt-1 text-xs font-semibold text-indigo-600">
                                Counter: {formatINR(offer.counterPrice)}/{offer.quantityUnit}
                              </p>
                            )}
                          </div>

                          {(offer.status === "pending" || offer.status === "negotiating") && (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleOfferRespond(offer._id, "accept")}
                                disabled={actionLoading === `offer-${offer._id}`}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                {actionLoading === `offer-${offer._id}` ? <Loader2 size={12} className="animate-spin" /> : "Accept"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOfferRespond(offer._id, "reject")}
                                disabled={actionLoading === `offer-${offer._id}`}
                                className="rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-200 disabled:opacity-50"
                              >
                                Reject
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOfferRespond(offer._id, "negotiate")}
                                disabled={actionLoading === `offer-${offer._id}`}
                                className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-200 disabled:opacity-50"
                              >
                                Negotiate
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </motion.section>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB: Orders                                                */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === "orders" && (
          <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-5">
            <motion.section variants={fadeUp}>
              <GlassCard>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <SectionTitle icon={ShoppingCart} title="Order Management" subtitle="Track and manage confirmed orders" />
                  <button type="button" onClick={fetchOrders} className="inline-flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200">
                    <RefreshCcw size={13} /> Refresh
                  </button>
                </div>

                {ordersLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <SkeletonBlock key={i} className="h-24" />)}
                  </div>
                ) : orders.length === 0 ? (
                  <div className="py-12 text-center">
                    <ShoppingCart size={40} className="mx-auto text-slate-300" />
                    <p className="mt-3 text-sm text-slate-400">No orders yet. Orders are created when you accept buyer offers.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.map((order) => (
                      <motion.div
                        key={order._id}
                        className="rounded-xl border border-slate-200 bg-white p-4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -2 }}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <p className="font-bold text-slate-800">Order #{order.orderId || order._id?.slice(-6)}</p>
                              <StatusBadge status={order.orderStatus || order.status} map={ORDER_STATUS_COLORS} />
                            </div>
                            <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                              <span>
                                <span className="text-xs text-slate-500">Crop: </span>
                                <span className="font-semibold">{order.cropName || order.items?.[0]?.cropName || "—"}</span>
                              </span>
                              <span>
                                <span className="text-xs text-slate-500">Qty: </span>
                                <span className="font-semibold">{order.quantity || order.items?.[0]?.quantity} {order.quantityUnit || order.items?.[0]?.unit}</span>
                              </span>
                              <span>
                                <span className="text-xs text-slate-500">Price: </span>
                                <span className="font-bold">{formatINR(order.pricePerUnit || order.items?.[0]?.pricePerKg)}/{order.quantityUnit || "kg"}</span>
                              </span>
                              <span>
                                <span className="text-xs text-slate-500">Total: </span>
                                <span className="font-black text-emerald-700">{formatINR(order.totalAmount)}</span>
                              </span>
                            </div>
                            <p className="mt-2 text-xs text-slate-500">
                              Buyer: {order.buyerName || order.buyer?.name || "—"} · {new Date(order.createdAt).toLocaleDateString("en-IN")}
                            </p>
                            {/* Delivery Address */}
                            {order.deliveryAddress && (
                              <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                                <MapPin size={11} className="text-emerald-600 mt-0.5 shrink-0" />
                                <div className="text-[11px] text-slate-600">
                                  <span className="font-semibold text-slate-700">{order.deliveryAddress.fullName}</span>
                                  {order.deliveryAddress.phone && <span className="text-slate-400"> · {order.deliveryAddress.phone}</span>}
                                  <br />
                                  {order.deliveryAddress.street}, {order.deliveryAddress.city}, {order.deliveryAddress.state} — {order.deliveryAddress.postalCode}
                                </div>
                              </div>
                            )}
                          </div>

                          {(order.orderStatus || order.status) !== "delivered" && (order.orderStatus || order.status) !== "cancelled" && (
                            <div className="flex flex-wrap gap-1.5">
                              {(order.orderStatus || order.status) === "pending" && (
                                <button type="button" onClick={() => handleOrderStatusUpdate(order._id, "confirmed")}
                                  disabled={actionLoading === `order-${order._id}`}
                                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                  Confirm
                                </button>
                              )}
                              {(order.orderStatus || order.status) === "paid" && (
                                <button type="button" onClick={() => handleOrderStatusUpdate(order._id, "confirmed")}
                                  disabled={actionLoading === `order-${order._id}`}
                                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                  Confirm
                                </button>
                              )}
                              {(order.orderStatus || order.status) === "confirmed" && (
                                <button type="button" onClick={() => handleOrderStatusUpdate(order._id, "processing")}
                                  disabled={actionLoading === `order-${order._id}`}
                                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                                >
                                  Processing
                                </button>
                              )}
                              {(order.orderStatus || order.status) === "processing" && (
                                <button type="button" onClick={() => handleOrderStatusUpdate(order._id, "shipped")}
                                  disabled={actionLoading === `order-${order._id}`}
                                  className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                                >
                                  Ship
                                </button>
                              )}
                              {(order.orderStatus || order.status) === "shipped" && (
                                <button type="button" onClick={() => handleOrderStatusUpdate(order._id, "delivered")}
                                  disabled={actionLoading === `order-${order._id}`}
                                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  Delivered
                                </button>
                              )}
                              <button type="button" onClick={() => handleOrderStatusUpdate(order._id, "cancelled")}
                                disabled={actionLoading === `order-${order._id}`}
                                className="rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-200 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </motion.section>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB: Analytics                                             */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === "analytics" && (
          <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-5">
            {analyticsLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => <SkeletonBlock key={i} className="h-28" />)}
              </div>
            ) : analytics ? (
              <>
                {/* Summary Cards */}
                <motion.div variants={fadeUp} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <GlassCard className="text-center">
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Total Revenue</p>
                    <p className="mt-2 text-2xl font-black text-emerald-800">{formatINR(analytics.totalRevenue)}</p>
                  </GlassCard>
                  <GlassCard className="text-center">
                    <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Crops Sold</p>
                    <p className="mt-2 text-2xl font-black text-blue-800">{analytics.soldListings}</p>
                  </GlassCard>
                  <GlassCard className="text-center">
                    <p className="text-xs font-bold uppercase tracking-widest text-violet-600">Avg Selling Price</p>
                    <p className="mt-2 text-2xl font-black text-violet-800">{formatINR(analytics.avgSellingPrice)}</p>
                  </GlassCard>
                  <GlassCard className="text-center">
                    <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Active Listings</p>
                    <p className="mt-2 text-2xl font-black text-amber-800">{analytics.activeListings}</p>
                  </GlassCard>
                </motion.div>

                {/* Revenue Chart */}
                {analytics.monthlySales && analytics.monthlySales.length > 0 && (
                  <motion.section variants={fadeUp}>
                    <GlassCard>
                      <SectionTitle icon={BarChart3} title="Sales Performance" subtitle="Monthly revenue and order trends" />
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analytics.monthlySales} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} />
                            <YAxis tick={{ fill: "#64748b", fontSize: 11 }} width={60} tickFormatter={(v) => `₹${v}`} />
                            <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Revenue"]} />
                            <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>
                              {analytics.monthlySales.map((entry, i) => (
                                <Cell key={`cell-${i}`} fill={entry.revenue > 0 ? "#059669" : "#94a3b8"} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </GlassCard>
                  </motion.section>
                )}

                {/* Orders Summary */}
                <motion.div variants={fadeUp} className="grid gap-4 sm:grid-cols-3">
                  <GlassCard className="text-center border-blue-200/40">
                    <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Total Orders</p>
                    <p className="mt-2 text-3xl font-black text-blue-800">{analytics.totalOrders}</p>
                  </GlassCard>
                  <GlassCard className="text-center border-amber-200/40">
                    <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Pending Orders</p>
                    <p className="mt-2 text-3xl font-black text-amber-800">{analytics.pendingOrders}</p>
                  </GlassCard>
                  <GlassCard className="text-center border-emerald-200/40">
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Completed Orders</p>
                    <p className="mt-2 text-3xl font-black text-emerald-800">{analytics.completedOrders}</p>
                  </GlassCard>
                </motion.div>

                {/* Crop Breakdown */}
                {analytics.cropBreakdown && Object.keys(analytics.cropBreakdown).length > 0 && (
                  <motion.section variants={fadeUp}>
                    <GlassCard>
                      <SectionTitle icon={Wheat} title="Crop-wise Breakdown" subtitle="Revenue and quantity by crop type" />
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {Object.entries(analytics.cropBreakdown).map(([crop, data]) => (
                          <motion.div key={crop} whileHover={cardHover} className="rounded-xl border border-slate-200 bg-white p-4">
                            <p className="font-bold text-slate-800">{crop}</p>
                            <p className="mt-1 text-lg font-black text-emerald-700">{formatINR(data.revenue)}</p>
                            <p className="text-xs text-slate-500">{data.quantity} units sold</p>
                          </motion.div>
                        ))}
                      </div>
                    </GlassCard>
                  </motion.section>
                )}
              </>
            ) : (
              <GlassCard className="py-12 text-center">
                <BarChart3 size={40} className="mx-auto text-slate-300" />
                <p className="mt-3 text-sm text-slate-400">No sales data available yet. Start selling to see analytics.</p>
              </GlassCard>
            )}
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB: Discover (Buyers + Demand)                            */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === "discover" && (
          <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-5">
            {discoveryLoading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => <SkeletonBlock key={i} className="h-32" />)}
              </div>
            ) : (
              <>
                {/* Smart Buyer Discovery */}
                <motion.section variants={fadeUp}>
                  <GlassCard>
                    <SectionTitle icon={Users} title="Smart Buyer Discovery" subtitle={`Nearby buyers interested in ${harvestCrop}`} />
                    {buyers.length === 0 ? (
                      <p className="py-8 text-center text-sm text-slate-400">No buyers found for this crop.</p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {buyers.slice(0, 9).map((buyer, idx) => (
                          <motion.div
                            key={`buyer-${idx}`}
                            className="rounded-xl border border-slate-200 bg-white p-4"
                            whileHover={cardHover}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.04 }}
                          >
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-slate-800">{buyer.businessName || buyer.buyerName}</p>
                              {buyer.verified && (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">✓ Verified</span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                              <MapPin size={11} className="mr-1 inline" /> {buyer.location} · {buyer.distance} km away
                            </p>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                                Buying: {buyer.buying}
                              </span>
                              <span className="text-xs text-amber-600">⭐ {buyer.rating}</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </GlassCard>
                </motion.section>

                {/* Market Demand Indicators */}
                <motion.section variants={fadeUp}>
                  <GlassCard>
                    <SectionTitle icon={Flame} title="Market Demand Indicators" subtitle="Current demand levels across crops" />
                    {demandIndicators.length === 0 ? (
                      <p className="py-8 text-center text-sm text-slate-400">No demand data available.</p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {demandIndicators.map((item) => {
                          const barColor = item.demandLevel === "High"
                            ? "from-emerald-400 to-emerald-600"
                            : item.demandLevel === "Medium"
                              ? "from-amber-400 to-amber-500"
                              : "from-rose-400 to-rose-500";
                          return (
                            <motion.div key={item.crop} whileHover={cardHover} className="rounded-xl border border-slate-200 bg-white p-4">
                              <div className="flex items-center justify-between">
                                <p className="font-bold text-slate-800">{item.crop}</p>
                                <DemandBadge level={item.demandLevel} />
                              </div>
                              <div className="mt-3 h-2 rounded-full bg-slate-100">
                                <motion.div
                                  className={`h-2 rounded-full bg-linear-to-r ${barColor}`}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(100, Math.max(10, item.demandScore))}%` }}
                                  transition={{ duration: 0.8, ease: "easeOut" }}
                                />
                              </div>
                              <p className="mt-1 text-right text-[11px] text-slate-500">{item.demandScore}/100</p>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </GlassCard>
                </motion.section>

                {/* Smart Contract Notice */}
                <motion.section variants={fadeUp}>
                  <GlassCard className="border-indigo-200/50 bg-indigo-50/30">
                    <SectionTitle icon={FileText} title="Smart Contract Option" subtitle="Digital agreements for secure transactions" />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border border-indigo-200 bg-white/80 p-4">
                        <p className="font-bold text-indigo-800">How it works</p>
                        <ul className="mt-2 space-y-1 text-sm text-indigo-700">
                          <li className="flex items-start gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-indigo-500" /> Buyer commits to purchase quantity at agreed price</li>
                          <li className="flex items-start gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-indigo-500" /> Digital agreement locks terms for both parties</li>
                          <li className="flex items-start gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-indigo-500" /> Reduces fraud risk and ensures fair trade</li>
                        </ul>
                      </div>
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                        <p className="font-bold text-emerald-800">Benefits</p>
                        <ul className="mt-2 space-y-1 text-sm text-emerald-700">
                          <li className="flex items-start gap-2"><Target size={14} className="mt-0.5 shrink-0 text-emerald-500" /> Guaranteed purchase quantity</li>
                          <li className="flex items-start gap-2"><Target size={14} className="mt-0.5 shrink-0 text-emerald-500" /> Price lock protection against market drops</li>
                          <li className="flex items-start gap-2"><Target size={14} className="mt-0.5 shrink-0 text-emerald-500" /> Dispute resolution framework</li>
                        </ul>
                      </div>
                    </div>
                  </GlassCard>
                </motion.section>
              </>
            )}
          </motion.div>
        )}

        {/* ── Footer Stats ─────────────────────────────────────────── */}
        <motion.section
          variants={fadeUp}
          className="grid gap-3 rounded-2xl border border-slate-200/60 bg-white/50 p-4 backdrop-blur-sm sm:grid-cols-2 lg:grid-cols-4"
        >
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Listings</p>
            <p className="mt-1 text-2xl font-black text-emerald-800">{listings.length}</p>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Offers</p>
            <p className="mt-1 text-2xl font-black text-blue-800">{offers.length}</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Orders</p>
            <p className="mt-1 text-2xl font-black text-amber-800">{orders.length}</p>
          </div>
          <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-violet-600">AI Engine</p>
            <p className="mt-1 text-lg font-black text-violet-800">{aiRecommendation?.price?.engine || "Ready"}</p>
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
};

export default SellCrop;

