import React, { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart2, RefreshCw, TrendingUp, Users, Brain,
  MapPin, Sprout, Download, Sparkles, SlidersHorizontal, X
} from "lucide-react";

import MarketTrendChart     from "../../components/reports/MarketTrendChart.jsx";
import DemandSupplyChart    from "../../components/reports/DemandSupplyChart.jsx";
import CropPerformanceChart from "../../components/reports/CropPerformanceChart.jsx";
import RegionMap            from "../../components/reports/RegionMap.jsx";
import AIPerformanceChart   from "../../components/reports/AIPerformanceChart.jsx";
import UserAnalyticsChart   from "../../components/reports/UserAnalyticsChart.jsx";
import AIInsightsPanel      from "../../components/reports/AIInsightsPanel.jsx";
import ReportGenerator      from "../../components/reports/ReportGenerator.jsx";

import {
  fetchOverview, fetchMarketTrends, fetchDemandSupply,
  fetchCropPerformance, fetchRegionAnalysis, fetchAIPerformance,
  fetchUserAnalytics, fetchAIInsights
} from "../../api/reportsApi.js";

const STALE = 120_000;

const GUJARAT_CITIES = ["Ahmedabad","Surat","Vadodara","Rajkot","Gandhinagar","Bhavnagar","Jamnagar","Junagadh","Anand","Mehsana"];
const CROPS = ["Wheat","Rice","Cotton","Groundnut","Bajra","Maize","Sugarcane","Tomato","Onion","Potato"];

const TABS = [
  { key: "market",   label: "Market",      icon: TrendingUp },
  { key: "crops",    label: "Crops",       icon: Sprout     },
  { key: "regions",  label: "Regions",     icon: MapPin     },
  { key: "ai",       label: "AI Engine",   icon: Brain      },
  { key: "users",    label: "Users",       icon: Users      },
];

/* ── KPI card ── */
const KPICard = ({ label, value, sub, color, loading }) => (
  <div className={`rounded-2xl p-5 border ${color.border} ${color.bg}`}>
    {loading ? (
      <div className="space-y-2">
        <div className="h-7 w-24 rounded-lg bg-white/60 animate-pulse" />
        <div className="h-3 w-16 rounded bg-white/40 animate-pulse" />
      </div>
    ) : (
      <>
        <p className={`text-2xl font-bold ${color.text}`}>{value}</p>
        <p className={`text-xs mt-1 ${color.sub}`}>{label}</p>
        {sub && <p className={`text-[11px] mt-0.5 ${color.sub} opacity-70`}>{sub}</p>}
      </>
    )}
  </div>
);

const Reports = () => {
  const [tab, setTab]           = useState("market");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters]   = useState({ from: "", to: "", crop: "", region: "" });
  const qc = useQueryClient();

  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
  const hasFilters = Object.values(filters).some(Boolean);

  const set = (k, v) => setFilters(p => ({ ...p, [k]: v }));
  const clearFilters = () => setFilters({ from: "", to: "", crop: "", region: "" });

  const overview   = useQuery({ queryKey: ["reports-overview"],           queryFn: fetchOverview,                          staleTime: STALE });
  const trends     = useQuery({ queryKey: ["reports-trends",   params],   queryFn: () => fetchMarketTrends(params),        staleTime: STALE, enabled: tab === "market"  });
  const ds         = useQuery({ queryKey: ["reports-ds",       params],   queryFn: () => fetchDemandSupply(params),        staleTime: STALE, enabled: tab === "market"  });
  const cropPerf   = useQuery({ queryKey: ["reports-crop",     params],   queryFn: () => fetchCropPerformance(params),     staleTime: STALE, enabled: tab === "crops"   });
  const region     = useQuery({ queryKey: ["reports-region",   params],   queryFn: () => fetchRegionAnalysis(params),      staleTime: STALE, enabled: tab === "regions" });
  const aiPerf     = useQuery({ queryKey: ["reports-ai-perf"],            queryFn: fetchAIPerformance,                     staleTime: STALE, enabled: tab === "ai"      });
  const userStats  = useQuery({ queryKey: ["reports-users",    params],   queryFn: () => fetchUserAnalytics(params),       staleTime: STALE, enabled: tab === "users"   });
  const aiInsights = useQuery({ queryKey: ["reports-insights"],           queryFn: fetchAIInsights,                        staleTime: STALE, enabled: false             });

  const refreshAll = useCallback(() => {
    ["reports-overview","reports-trends","reports-ds","reports-crop","reports-region","reports-ai-perf","reports-users"]
      .forEach(k => qc.invalidateQueries({ queryKey: [k] }));
  }, [qc]);

  const refreshInsights = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["reports-insights"] });
    aiInsights.refetch();
  }, [qc, aiInsights]);

  const isLoading = overview.isLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef]">

      {/* ── Sticky top bar ── */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-8">

          {/* Header row */}
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <BarChart2 size={18} className="text-emerald-700" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base font-bold text-slate-900 leading-none">Reports & Analytics</h1>
                <p className="text-[11px] text-slate-400 mt-0.5">AgroVision Intelligence Platform</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Filter toggle */}
              <button onClick={() => setShowFilters(p => !p)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                  showFilters || hasFilters
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}>
                <SlidersHorizontal size={13} />
                Filters
                {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
              </button>

              <button onClick={refreshAll} disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
                <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <ReportGenerator filters={filters} compact />
            </div>
          </div>

          {/* Filter bar (collapsible) */}
          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-t border-slate-100">
                <div className="py-3 flex flex-wrap items-end gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">From</label>
                    <input type="date" value={filters.from} onChange={e => set("from", e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">To</label>
                    <input type="date" value={filters.to} onChange={e => set("to", e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Crop</label>
                    <select value={filters.crop} onChange={e => set("crop", e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50">
                      <option value="">All Crops</option>
                      {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Region</label>
                    <select value={filters.region} onChange={e => set("region", e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50">
                      <option value="">All Regions</option>
                      {GUJARAT_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  {hasFilters && (
                    <button onClick={clearFilters}
                      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-2 py-2 transition-colors">
                      <X size={12} /> Clear
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tab nav */}
          <div className="flex gap-0.5 -mb-px pt-1">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  tab === key
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Page body ── */}
      <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-6 space-y-6">

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <KPICard label="Total Listings"    value={(overview.data?.totalListings  || 0).toLocaleString()} color={{ bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", sub: "text-emerald-600" }} loading={overview.isLoading} />
          <KPICard label="Total Orders"      value={(overview.data?.totalOrders    || 0).toLocaleString()} color={{ bg: "bg-blue-50",    border: "border-blue-200",    text: "text-blue-800",    sub: "text-blue-600"    }} loading={overview.isLoading} />
          <KPICard label="Sales Volume"      value={`${(overview.data?.totalVolume || 0).toLocaleString()} kg`} color={{ bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-800", sub: "text-violet-600" }} loading={overview.isLoading} />
          <KPICard label="Revenue Generated" value={`₹${(overview.data?.totalRevenue || 0).toLocaleString()}`} color={{ bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", sub: "text-amber-600" }} loading={overview.isLoading} />
          <KPICard label="AI Accuracy"       value={`${overview.data?.aiAccuracy || 0}%`} sub="avg confidence" color={{ bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-800", sub: "text-rose-600" }} loading={overview.isLoading} />
        </div>

        {/* ── Tab content ── */}
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>

            {/* MARKET tab */}
            {tab === "market" && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
                  <MarketTrendChart  data={trends.data || []} loading={trends.isLoading} />
                  <DemandSupplyChart data={ds.data     || []} loading={ds.isLoading} />
                </div>
                <div className="space-y-6">
                  <AIInsightsPanel insights={aiInsights.data?.insights || []} loading={aiInsights.isFetching} onRefresh={refreshInsights} />
                </div>
              </div>
            )}

            {/* CROPS tab */}
            {tab === "crops" && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                  <CropPerformanceChart data={cropPerf.data || []} loading={cropPerf.isLoading} />
                </div>
                <div className="space-y-6">
                  <AIInsightsPanel insights={aiInsights.data?.insights || []} loading={aiInsights.isFetching} onRefresh={refreshInsights} />
                </div>
              </div>
            )}

            {/* REGIONS tab */}
            {tab === "regions" && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                  <RegionMap data={region.data || []} loading={region.isLoading} />
                </div>
                <div className="space-y-6">
                  <AIInsightsPanel insights={aiInsights.data?.insights || []} loading={aiInsights.isFetching} onRefresh={refreshInsights} />
                </div>
              </div>
            )}

            {/* AI ENGINE tab */}
            {tab === "ai" && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                  <AIPerformanceChart data={aiPerf.data || []} loading={aiPerf.isLoading} />
                </div>
                <div className="space-y-6">
                  <AIInsightsPanel insights={aiInsights.data?.insights || []} loading={aiInsights.isFetching} onRefresh={refreshInsights} />
                </div>
              </div>
            )}

            {/* USERS tab */}
            {tab === "users" && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                  <UserAnalyticsChart data={userStats.data || []} loading={userStats.isLoading} />
                </div>
                <div className="space-y-6">
                  <AIInsightsPanel insights={aiInsights.data?.insights || []} loading={aiInsights.isFetching} onRefresh={refreshInsights} />
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Reports;
