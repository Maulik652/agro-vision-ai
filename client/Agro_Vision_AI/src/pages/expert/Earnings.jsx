import React, { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign, RefreshCw, TrendingUp, Users, Activity,
  BarChart2, Brain, SlidersHorizontal, X
} from "lucide-react";

import EarningsOverview   from "../../components/earnings/EarningsOverview.jsx";
import RevenueChart       from "../../components/earnings/RevenueChart.jsx";
import TransactionTable   from "../../components/earnings/TransactionTable.jsx";
import CommissionAnalytics from "../../components/earnings/CommissionAnalytics.jsx";
import PayoutManager      from "../../components/earnings/PayoutManager.jsx";
import PaymentStatus      from "../../components/earnings/PaymentStatus.jsx";
import RevenueForecast    from "../../components/earnings/RevenueForecast.jsx";
import ExportReports      from "../../components/earnings/ExportReports.jsx";
import AlertsPanel        from "../../components/earnings/AlertsPanel.jsx";

import {
  fetchOverview, fetchTrends, fetchTransactions,
  fetchCommission, fetchPayouts, fetchPaymentStatus, fetchForecast
} from "../../api/earningsApi.js";

const STALE = 120_000;

const TABS = [
  { key: "overview",     label: "Overview",     icon: DollarSign  },
  { key: "transactions", label: "Transactions", icon: Activity    },
  { key: "payouts",      label: "Payouts",      icon: Users       },
  { key: "commission",   label: "Commission",   icon: BarChart2   },
  { key: "forecast",     label: "Forecast",     icon: Brain       },
];

const Earnings = () => {
  const [tab, setTab]               = useState("overview");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters]       = useState({ from: "", to: "" });
  const [trendPeriod, setTrendPeriod] = useState("daily");
  const [txFilters, setTxFilters]   = useState({ status: "", method: "", page: 1 });
  const [payoutFilters, setPayoutFilters] = useState({ status: "", page: 1 });
  const qc = useQueryClient();

  const dateParams = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
  const hasFilters = Object.values(filters).some(Boolean);

  const set = (k, v) => setFilters(p => ({ ...p, [k]: v }));
  const clearFilters = () => setFilters({ from: "", to: "" });

  const overview   = useQuery({ queryKey: ["earnings-overview",   dateParams],                    queryFn: () => fetchOverview(dateParams),                                  staleTime: STALE });
  const trends     = useQuery({ queryKey: ["earnings-trends",     dateParams, trendPeriod],       queryFn: () => fetchTrends({ ...dateParams, period: trendPeriod }),        staleTime: STALE, enabled: tab === "overview"  });
  const payStatus  = useQuery({ queryKey: ["earnings-pay-status", dateParams],                    queryFn: () => fetchPaymentStatus(dateParams),                             staleTime: STALE, enabled: tab === "overview"  });
  const forecast   = useQuery({ queryKey: ["earnings-forecast"],                                  queryFn: fetchForecast,                                                    staleTime: STALE * 2.5, enabled: tab === "forecast" });
  const commission = useQuery({ queryKey: ["earnings-commission", dateParams],                    queryFn: () => fetchCommission(dateParams),                                staleTime: STALE, enabled: tab === "commission" });
  const transactions = useQuery({ queryKey: ["earnings-transactions", dateParams, txFilters],     queryFn: () => fetchTransactions({ ...dateParams, ...txFilters }),         staleTime: STALE, enabled: tab === "transactions" });
  const payouts    = useQuery({ queryKey: ["earnings-payouts",    payoutFilters],                 queryFn: () => fetchPayouts(payoutFilters),                                staleTime: STALE, enabled: tab === "payouts" });

  const refreshAll = useCallback(() => {
    ["earnings-overview","earnings-trends","earnings-pay-status","earnings-forecast","earnings-commission","earnings-transactions","earnings-payouts"]
      .forEach(k => qc.invalidateQueries({ queryKey: [k] }));
  }, [qc]);

  const mergeTxFilters  = (patch) => setTxFilters(p => ({ ...p, ...patch }));
  const mergePayFilters = (patch) => setPayoutFilters(p => ({ ...p, ...patch }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef]">

      {/* Sticky top bar */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-8">

          {/* Header row */}
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <DollarSign size={18} className="text-emerald-700" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base font-bold text-slate-900 leading-none">Earnings & Revenue</h1>
                <p className="text-[11px] text-slate-400 mt-0.5">AgroVision Finance Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
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

              <button onClick={refreshAll} disabled={overview.isLoading}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
                <RefreshCw size={13} className={overview.isLoading ? "animate-spin" : ""} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <ExportReports filters={{ ...dateParams }} />
            </div>
          </div>

          {/* Collapsible filter bar */}
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

      {/* Page body */}
      <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-6 space-y-6">

        {/* KPI strip — always visible */}
        <EarningsOverview data={overview.data} loading={overview.isLoading} />

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>

            {/* OVERVIEW */}
            {tab === "overview" && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
                  <RevenueChart data={trends.data || []} loading={trends.isLoading} period={trendPeriod} onPeriodChange={setTrendPeriod} />
                </div>
                <div className="space-y-6">
                  <PaymentStatus data={payStatus.data} loading={payStatus.isLoading} />
                  <AlertsPanel />
                </div>
              </div>
            )}

            {/* TRANSACTIONS */}
            {tab === "transactions" && (
              <TransactionTable
                data={transactions.data}
                loading={transactions.isLoading}
                filters={txFilters}
                onFilterChange={mergeTxFilters}
              />
            )}

            {/* PAYOUTS */}
            {tab === "payouts" && (
              <PayoutManager
                data={payouts.data}
                loading={payouts.isLoading}
                filters={payoutFilters}
                onFilterChange={mergePayFilters}
              />
            )}

            {/* COMMISSION */}
            {tab === "commission" && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                  <CommissionAnalytics data={commission.data || {}} loading={commission.isLoading} />
                </div>
                <div>
                  <AlertsPanel />
                </div>
              </div>
            )}

            {/* FORECAST */}
            {tab === "forecast" && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                  <RevenueForecast data={forecast.data} loading={forecast.isLoading} />
                </div>
                <div>
                  <AlertsPanel />
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Earnings;
