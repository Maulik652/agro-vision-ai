import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { io } from "socket.io-client";
import { useAuth } from "../../context/AuthContext";
import { useExpertDashboardStore } from "../../store/expertDashboardStore";
import {
  fetchExpertOverview,
  fetchExpertDiseaseReports,
  fetchExpertFarmerActivity,
  fetchExpertCropDemand,
  fetchExpertQualityReports,
  fetchExpertPlatformAnalytics
} from "../../api/expertDashboardApi";

import OverviewCards         from "../../components/expertDashboard/OverviewCards";
import MarketTrendChart      from "../../components/expertDashboard/MarketTrendChart";
import AIPredictionInsights  from "../../components/expertDashboard/AIPredictionInsights";
import DiseaseReports        from "../../components/expertDashboard/DiseaseReports";
import FarmerActivityTable   from "../../components/expertDashboard/FarmerActivityTable";
import DemandAnalyticsChart  from "../../components/expertDashboard/DemandAnalyticsChart";
import QualityVerificationPanel from "../../components/expertDashboard/QualityVerificationPanel";
import ExpertRecommendation  from "../../components/expertDashboard/ExpertRecommendation";
import PlatformAnalytics     from "../../components/expertDashboard/PlatformAnalytics";
import AlertsPanel           from "../../components/expertDashboard/AlertsPanel";

const STALE = 120_000;

const resolveSocketUrl = () => {
  const url = String(import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL || "").trim();
  return url ? url.replace(/\/api\/?$/, "") : "http://localhost:5000";
};

const greet = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

export default function ExpertDashboard() {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const { setSocketConnected, pushAlert, selectedCrop } = useExpertDashboardStore();

  /* ── Queries ── */
  const overviewQ  = useQuery({ queryKey: ["expert-overview"],          queryFn: fetchExpertOverview,          staleTime: STALE });
  const diseaseQ   = useQuery({ queryKey: ["expert-disease-reports"],   queryFn: () => fetchExpertDiseaseReports({ limit: 20 }),   staleTime: STALE });
  const activityQ  = useQuery({ queryKey: ["expert-farmer-activity"],   queryFn: () => fetchExpertFarmerActivity({ limit: 30 }),   staleTime: STALE });
  const demandQ    = useQuery({ queryKey: ["expert-crop-demand"],       queryFn: fetchExpertCropDemand,        staleTime: STALE });
  const qualityQ   = useQuery({ queryKey: ["expert-quality-reports"],   queryFn: () => fetchExpertQualityReports({ limit: 18 }),   staleTime: STALE });
  const analyticsQ = useQuery({ queryKey: ["expert-platform-analytics"],queryFn: fetchExpertPlatformAnalytics, staleTime: STALE });

  /* ── Socket.IO real-time alerts ── */
  useEffect(() => {
    const token = localStorage.getItem("token");
    const socket = io(resolveSocketUrl(), {
      transports: ["websocket"],
      withCredentials: true,
      auth: token ? { token } : undefined
    });
    socketRef.current = socket;

    socket.on("connect",       () => setSocketConnected(true));
    socket.on("disconnect",    () => setSocketConnected(false));
    socket.on("price_spike",   (d) => pushAlert({ type: "price_spike",   title: "Price Spike",    message: d?.message || `${d?.crop || "Crop"} price spiked` }));
    socket.on("disease_alert", (d) => pushAlert({ type: "disease_alert", title: "Disease Alert",  message: d?.message || `Disease detected: ${d?.disease || "Unknown"}` }));
    socket.on("supply_drop",   (d) => pushAlert({ type: "supply_drop",   title: "Supply Drop",    message: d?.message || `Supply dropped for ${d?.crop || "a crop"}` }));

    return () => { socket.disconnect(); setSocketConnected(false); };
  }, []);

  const availableCrops = overviewQ.data ? [] : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef]">
      <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {greet()}, {user?.name?.split(" ")[0] || "Expert"} 👋
            </h1>
            <p className="text-slate-500 text-sm mt-1">Agriculture Analytics Control Center · AgroVision AI</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-600">Live Dashboard</span>
          </div>
        </motion.div>

        {/* 1. Overview Cards */}
        <OverviewCards data={overviewQ.data} isLoading={overviewQ.isLoading} />

        {/* 2 & 3. Market Trends + AI Predictions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MarketTrendChart availableCrops={availableCrops} />
          <AIPredictionInsights availableCrops={availableCrops} />
        </div>

        {/* 4 & 5. Disease Reports + Farmer Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DiseaseReports data={diseaseQ.data || []} isLoading={diseaseQ.isLoading} />
          <FarmerActivityTable data={activityQ.data || []} isLoading={activityQ.isLoading} />
        </div>

        {/* 6 & 7. Demand Analytics + Quality Verification */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DemandAnalyticsChart data={demandQ.data || []} isLoading={demandQ.isLoading} />
          <QualityVerificationPanel data={qualityQ.data || []} isLoading={qualityQ.isLoading} />
        </div>

        {/* 8 & 9. Recommendation + Platform Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ExpertRecommendation />
          <PlatformAnalytics data={analyticsQ.data} isLoading={analyticsQ.isLoading} />
        </div>

        {/* 10. Real-Time Alerts */}
        <AlertsPanel />

      </div>
    </div>
  );
}
