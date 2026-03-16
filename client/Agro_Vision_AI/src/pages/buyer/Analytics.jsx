/**
 * Analytics Page — AgroVision AI Buyer Panel
 * Route: /buyer/analytics
 *
 * Fully dynamic. Real-time via Socket.IO — order/wallet changes
 * auto-refresh all charts and stats without any page reload.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart2, Wifi } from "lucide-react";

import { fetchBuyerAnalytics, fetchAIInsights, fetchAIPredictions } from "../../services/analyticsAPI.js";
import useAnalyticsSocket from "../../hooks/useAnalyticsSocket.js";

import AnalyticsFilters         from "../../components/analytics/AnalyticsFilters.jsx";
import StatsCards               from "../../components/analytics/StatsCards.jsx";
import SpendingChart            from "../../components/analytics/SpendingChart.jsx";
import CropDistributionChart    from "../../components/analytics/CropDistributionChart.jsx";
import DeliveryPerformanceChart from "../../components/analytics/DeliveryPerformanceChart.jsx";
import TopFarmersChart          from "../../components/analytics/TopFarmersChart.jsx";
import AIInsightsPanel          from "../../components/analytics/AIInsightsPanel.jsx";
import AIPredictionPanel        from "../../components/analytics/AIPredictionPanel.jsx";

export default function Analytics() {
  const [range,    setRange]    = useState("30d");
  const [cropType, setCropType] = useState("");

  /* ── Real-time socket — auto-invalidates React Query cache ── */
  useAnalyticsSocket({ range, cropType });

  /* ── Analytics data ─────────────────────────────────────── */
  const { data, isLoading, isFetching: statsFetching } = useQuery({
    queryKey:  ["buyer-analytics", range, cropType],
    queryFn:   () => fetchBuyerAnalytics({ range, cropType: cropType || undefined }),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  /* ── AI Insights ─────────────────────────────────────────── */
  const {
    data: insightsData,
    isLoading: insightsLoading,
    refetch: refetchInsights,
    isFetching: insightsFetching,
  } = useQuery({
    queryKey:  ["analytics-insights"],
    queryFn:   fetchAIInsights,
    staleTime: 120_000,
    refetchOnWindowFocus: true,
  });

  /* ── AI Predictions ──────────────────────────────────────── */
  const {
    data: predictionsData,
    isLoading: predictionsLoading,
    refetch: refetchPredictions,
    isFetching: predictionsFetching,
  } = useQuery({
    queryKey:  ["analytics-predictions"],
    queryFn:   fetchAIPredictions,
    staleTime: 120_000,
  });

  const isLiveUpdating = statsFetching && !isLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef]">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                <BarChart2 size={18} className="text-green-700" />
              </div>
              <div>
                <h1 className="text-slate-900 font-bold text-lg">Analytics</h1>
                <p className="text-slate-400 text-xs">AI-powered insights into your purchasing behavior</p>
              </div>
              {/* Live badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-100">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <span className="text-xs font-medium text-green-700">Live</span>
              </div>
            </div>
            <AnalyticsFilters
              range={range}
              cropType={cropType}
              onRangeChange={setRange}
              onCropTypeChange={setCropType}
            />
          </div>
        </div>
      </div>

      {/* ── Live update toast ──────────────────────────────── */}
      <AnimatePresence>
        {isLiveUpdating && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-green-700 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg pointer-events-none"
          >
            <Wifi size={12} className="animate-pulse" />
            Updating analytics...
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Page content ───────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Overview stats */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <StatsCards data={data} isLoading={isLoading} />
        </motion.div>

        {/* Spending trend + Crop distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SpendingChart data={data?.monthlySpending} isLoading={isLoading} />
          <CropDistributionChart data={data?.topCrops} isLoading={isLoading} />
        </div>

        {/* Delivery performance + Top farmers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DeliveryPerformanceChart data={data?.deliveryPerformance} isLoading={isLoading} />
          <TopFarmersChart data={data?.topFarmers} isLoading={isLoading} />
        </div>

        {/* AI panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AIInsightsPanel
            data={insightsData}
            isLoading={insightsLoading || insightsFetching}
            onRefresh={refetchInsights}
          />
          <AIPredictionPanel
            data={predictionsData}
            isLoading={predictionsLoading || predictionsFetching}
            onRefresh={refetchPredictions}
          />
        </div>

      </div>
    </div>
  );
}
