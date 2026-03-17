import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Package, TrendingUp, ShoppingCart, Bell, Plus,
  RefreshCcw, Sparkles, HandCoins, BarChart3, Star, Zap, Eye,
  Warehouse, Bot, ArrowUpRight, ExternalLink, ChevronRight,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import SummaryCards from "../../components/farmer/marketplace/SummaryCards";
import ListingsGrid from "../../components/farmer/marketplace/ListingsGrid";
import FilterSidebar from "../../components/farmer/marketplace/FilterSidebar";
import MarketInsightsPanel from "../../components/farmer/marketplace/MarketInsightsPanel";
import BuyerRequestsPanel from "../../components/farmer/marketplace/BuyerRequestsPanel";
import OrdersWidget from "../../components/farmer/marketplace/OrdersWidget";
import EarningsWidget from "../../components/farmer/marketplace/EarningsWidget";
import ReviewsWidget from "../../components/farmer/marketplace/ReviewsWidget";
import NotificationsPanel from "../../components/farmer/marketplace/NotificationsPanel";
import InventoryPanel from "../../components/farmer/marketplace/InventoryPanel";
import PerformanceAnalytics from "../../components/farmer/marketplace/PerformanceAnalytics";
import AISellingAssistant from "../../components/farmer/marketplace/AISellingAssistant";
import FarmerProfileBanner from "../../components/farmer/marketplace/FarmerProfileBanner";
import { getMarketSummary } from "../../api/farmerMarketplaceApi";

const fadeUp = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } } };
const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.04 } } };

const TABS = [
  { key: "overview",  label: "Overview",     icon: LayoutDashboard },
  { key: "listings",  label: "My Listings",  icon: Package },
  { key: "offers",    label: "Buyer Offers", icon: HandCoins },
  { key: "orders",    label: "Orders",       icon: ShoppingCart },
  { key: "earnings",  label: "Earnings",     icon: BarChart3 },
  { key: "insights",  label: "Market Intel", icon: TrendingUp },
  { key: "inventory", label: "Inventory",    icon: Warehouse },
  { key: "analytics", label: "Performance",  icon: Eye },
  { key: "assistant", label: "AI Assistant", icon: Bot },
  { key: "reviews",   label: "Reviews",      icon: Star },
];

const fmt = (v) => { const n = Number(v); if (n >= 100000) return `₹${(n/100000).toFixed(1)}L`; if (n >= 1000) return `₹${(n/1000).toFixed(1)}K`; return `₹${n||0}`; };

export default function FarmerMarketplace() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [showNotif, setShowNotif] = useState(false);
  const [filters, setFilters] = useState({ search: "", category: "All", status: "all", sortBy: "newest" });
  const [selectedCrop, setSelectedCrop] = useState("Wheat");
  const qc = useQueryClient();

  const { data: summaryData, isLoading: summaryLoading } = useQuery({ queryKey: ["farmerMarketSummary"], queryFn: getMarketSummary, staleTime: 60000, retry: 1 });
  const summary = summaryData?.summary || {};

  const handleRefresh = useCallback(() => {
    ["farmerMarketSummary","farmerListings","farmerOrders","farmerEarnings","farmerOffers","farmerInsights","farmerInventory","farmerAnalytics","farmerProfile"].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
    toast.success("Dashboard refreshed");
  }, [qc]);

  const HERO_STATS = [
    { label: "Active Listings", value: summary.activeListings ?? 0,          icon: Package,    color: "text-emerald-300", bg: "bg-emerald-500/20" },
    { label: "Pending Offers",  value: summary.pendingOffers ?? 0,           icon: HandCoins,  color: "text-amber-300",   bg: "bg-amber-500/20" },
    { label: "Total Orders",    value: summary.totalOrders ?? 0,             icon: ShoppingCart,color: "text-blue-300",   bg: "bg-blue-500/20" },
    { label: "This Month",      value: fmt(summary.thisMonthEarnings ?? 0),  icon: BarChart3,  color: "text-violet-300",  bg: "bg-violet-500/20" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/10">
      {/* HERO */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 px-4 pt-8 pb-0 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white backdrop-blur-sm">
                <Sparkles size={12} /> AgroVision AI · Seller Dashboard
              </div>
              <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl">My Marketplace Dashboard</h1>
              <p className="mt-1.5 max-w-xl text-sm text-emerald-100/80">Manage listings, track performance, interact with buyers and optimize pricing with AI.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowNotif(v => !v)}
                  className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 transition">
                  <Bell size={18} />
                  {(summary.pendingOffers || 0) > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white">{summary.pendingOffers > 9 ? "9+" : summary.pendingOffers}</span>}
                </motion.button>
                <AnimatePresence>
                  {showNotif && (
                    <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }} className="absolute right-0 top-12 z-50 w-80">
                      <NotificationsPanel onClose={() => setShowNotif(false)} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleRefresh}
                className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20 transition">
                <RefreshCcw size={15} /> Refresh
              </motion.button>
              <motion.button whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.97 }} onClick={() => navigate("/farmer/sell-crop")}
                className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-black text-emerald-700 shadow-lg shadow-black/20 hover:bg-emerald-50 transition">
                <Plus size={16} /> Sell New Crop <ExternalLink size={13} className="opacity-60" />
              </motion.button>
            </div>
          </div>

          {!summaryLoading && (
            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {HERO_STATS.map(s => (
                <motion.div key={s.label} whileHover={{ y: -2 }} className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/8 px-3 py-3 backdrop-blur-sm">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${s.bg}`}><s.icon size={16} className={s.color} /></div>
                  <div><p className="text-lg font-black text-white leading-none">{s.value}</p><p className="text-[10px] font-semibold text-white/60 mt-0.5">{s.label}</p></div>
                </motion.div>
              ))}
            </div>
          )}

          <div className="mt-5 flex gap-0.5 overflow-x-auto scrollbar-hide">
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex shrink-0 items-center gap-1.5 rounded-t-xl px-4 py-2.5 text-xs font-semibold transition-all ${activeTab === tab.key ? "bg-white text-emerald-700 shadow-sm" : "text-white/70 hover:bg-white/10 hover:text-white"}`}>
                <tab.icon size={13} />{tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">

          {activeTab === "overview" && (
            <motion.div key="overview" variants={stagger} initial="hidden" animate="visible" className="space-y-6">
              <motion.div variants={fadeUp}><FarmerProfileBanner /></motion.div>
              <motion.div variants={fadeUp}><SummaryCards summary={summary} loading={summaryLoading} /></motion.div>
              <div className="grid gap-6 lg:grid-cols-3">
                <motion.div variants={fadeUp} className="lg:col-span-2"><EarningsWidget compact /></motion.div>
                <motion.div variants={fadeUp}><BuyerRequestsPanel compact onTabSwitch={() => setActiveTab("offers")} /></motion.div>
              </div>
              <div className="grid gap-6 lg:grid-cols-3">
                <motion.div variants={fadeUp} className="lg:col-span-2"><MarketInsightsPanel selectedCrop={selectedCrop} onCropChange={setSelectedCrop} compact /></motion.div>
                <motion.div variants={fadeUp}><OrdersWidget compact onTabSwitch={() => setActiveTab("orders")} /></motion.div>
              </div>
              <motion.div variants={fadeUp} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Sell New Crop",   desc: "Go to listing form",    icon: Plus,       color: "bg-emerald-600", action: () => navigate("/farmer/sell-crop") },
                  { label: "Manage Listings", desc: "Edit, pause, delete",   icon: Package,    color: "bg-blue-600",    action: () => setActiveTab("listings") },
                  { label: "Market Intel",    desc: "AI price & demand",     icon: TrendingUp, color: "bg-violet-600",  action: () => setActiveTab("insights") },
                  { label: "AI Assistant",    desc: "Ask selling questions", icon: Bot,        color: "bg-rose-600",    action: () => setActiveTab("assistant") },
                ].map(a => (
                  <motion.button key={a.label} whileHover={{ y: -3, scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={a.action}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white p-4 text-left shadow-sm hover:shadow-md transition-all">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${a.color} text-white`}><a.icon size={18} /></div>
                    <div className="min-w-0"><p className="text-sm font-bold text-slate-800">{a.label}</p><p className="text-xs text-slate-500">{a.desc}</p></div>
                    <ChevronRight size={14} className="ml-auto shrink-0 text-slate-400" />
                  </motion.button>
                ))}
              </motion.div>
              <motion.div variants={fadeUp} className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white"><Zap size={16} /></div>
                <div>
                  <p className="text-sm font-bold text-emerald-800">AI Selling Tip</p>
                  <p className="mt-0.5 text-xs text-emerald-700">Listings with Grade A quality and organic certification get <strong>23% more buyer interest</strong>. Use the AI Assistant for personalized selling advice.</p>
                </div>
                <button onClick={() => setActiveTab("assistant")} className="ml-auto shrink-0 flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition">
                  Ask AI <ArrowUpRight size={11} />
                </button>
              </motion.div>
            </motion.div>
          )}

          {activeTab === "listings" && (
            <motion.div key="listings" variants={stagger} initial="hidden" animate="visible" className="grid gap-6 lg:grid-cols-4">
              <motion.div variants={fadeUp} className="lg:col-span-1"><FilterSidebar filters={filters} onChange={setFilters} /></motion.div>
              <motion.div variants={fadeUp} className="lg:col-span-3">
                <ListingsGrid filters={filters} onAddNew={() => navigate("/farmer/sell-crop")}
                  onListingChanged={() => { qc.invalidateQueries({ queryKey: ["farmerListings"] }); qc.invalidateQueries({ queryKey: ["farmerMarketSummary"] }); }} />
              </motion.div>
            </motion.div>
          )}

          {activeTab === "offers"    && <motion.div key="offers"    variants={fadeUp} initial="hidden" animate="visible"><BuyerRequestsPanel /></motion.div>}
          {activeTab === "orders"    && <motion.div key="orders"    variants={fadeUp} initial="hidden" animate="visible"><OrdersWidget /></motion.div>}
          {activeTab === "earnings"  && <motion.div key="earnings"  variants={fadeUp} initial="hidden" animate="visible"><EarningsWidget /></motion.div>}
          {activeTab === "insights"  && <motion.div key="insights"  variants={fadeUp} initial="hidden" animate="visible"><MarketInsightsPanel selectedCrop={selectedCrop} onCropChange={setSelectedCrop} /></motion.div>}
          {activeTab === "inventory" && <motion.div key="inventory" variants={fadeUp} initial="hidden" animate="visible"><InventoryPanel /></motion.div>}
          {activeTab === "analytics" && <motion.div key="analytics" variants={fadeUp} initial="hidden" animate="visible"><PerformanceAnalytics /></motion.div>}
          {activeTab === "assistant" && <motion.div key="assistant" variants={fadeUp} initial="hidden" animate="visible"><AISellingAssistant /></motion.div>}
          {activeTab === "reviews"   && <motion.div key="reviews"   variants={fadeUp} initial="hidden" animate="visible"><ReviewsWidget /></motion.div>}

        </AnimatePresence>
      </div>
    </div>
  );
}
