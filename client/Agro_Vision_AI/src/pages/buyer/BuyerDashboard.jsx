import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Activity, Clock } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { connectBuyerDashboardSocket } from "../../realtime/dashboardSocket";
import { useBuyerDashboardStore } from "../../store/buyerDashboardStore";

import {
  fetchDashboardAIInsights,
  fetchDashboardFavoriteCrops,
  fetchDashboardNotifications,
  fetchDashboardOverview,
  fetchDashboardPriceTrends,
  fetchDashboardRecentOrders,
  fetchDashboardRecommendations,
  fetchDashboardSpending,
  fetchDashboardTopFarmers
} from "../../api/dashboardApi";

import OverviewCards from "../../components/dashboard/OverviewCards";
import PriceTrendChart from "../../components/dashboard/PriceTrendChart";
import AIRecommendations from "../../components/dashboard/AIRecommendations";
import SpendingAnalytics from "../../components/dashboard/SpendingAnalytics";
import FavoriteCrops from "../../components/dashboard/FavoriteCrops";
import TopFarmers from "../../components/dashboard/TopFarmers";
import AIInsights from "../../components/dashboard/AIInsights";
import RecentOrders from "../../components/dashboard/RecentOrders";
import NotificationsPanel from "../../components/dashboard/NotificationsPanel";
import QuickActions from "../../components/dashboard/QuickActions";
import AdvisoryDashboardWidget from "../../components/publicAdvisory/AdvisoryDashboardWidget";

const STALE_MS = 120_000;

const greetingByHour = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

export default function BuyerDashboard() {
  const { user } = useAuth();
  const socketRef = useRef(null);

  const {
    selectedCrop,
    selectedDays,
    isSocketConnected,
    realtimeNotifications,
    setSelectedCrop,
    setSelectedDays,
    setSocketConnected,
    pushRealtimeNotification
  } = useBuyerDashboardStore();

  const overviewQuery = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: fetchDashboardOverview,
    staleTime: STALE_MS
  });

  const priceTrendsQuery = useQuery({
    queryKey: ["dashboard-price-trends", selectedCrop, selectedDays],
    queryFn: () => fetchDashboardPriceTrends({ crop: selectedCrop, days: selectedDays }),
    staleTime: STALE_MS
  });

  const recommendationsQuery = useQuery({
    queryKey: ["dashboard-recommendations"],
    queryFn: () => fetchDashboardRecommendations({ limit: 6 }),
    staleTime: STALE_MS
  });

  const recentOrdersQuery = useQuery({
    queryKey: ["dashboard-recent-orders"],
    queryFn: () => fetchDashboardRecentOrders({ limit: 8 }),
    staleTime: STALE_MS
  });

  const spendingQuery = useQuery({
    queryKey: ["dashboard-spending"],
    queryFn: fetchDashboardSpending,
    staleTime: STALE_MS
  });

  const topFarmersQuery = useQuery({
    queryKey: ["dashboard-top-farmers"],
    queryFn: () => fetchDashboardTopFarmers({ limit: 6 }),
    staleTime: STALE_MS
  });

  const aiInsightsQuery = useQuery({
    queryKey: ["dashboard-ai-insights"],
    queryFn: fetchDashboardAIInsights,
    staleTime: STALE_MS
  });

  const notificationsQuery = useQuery({
    queryKey: ["dashboard-notifications"],
    queryFn: () => fetchDashboardNotifications({ limit: 12 }),
    staleTime: 30_000
  });

  const favoriteCropsQuery = useQuery({
    queryKey: ["dashboard-favorite-crops"],
    queryFn: () => fetchDashboardFavoriteCrops({ limit: 6 }),
    staleTime: STALE_MS
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return undefined;

    const socket = connectBuyerDashboardSocket(token);
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);
      const userId = String(user?._id || user?.id || "");
      if (userId) socket.emit("subscribe_dashboard_events", { userId });
    });

    socket.on("disconnect", () => setSocketConnected(false));

    socket.on("order_update", (payload = {}) => {
      pushRealtimeNotification({
        type: "order_update",
        title: "Order Updated",
        message: `Order ${payload.order?.orderId || ""} → ${payload.order?.status || "updated"}.`,
        priority: "normal",
        createdAt: payload.emittedAt
      });
    });

    socket.on("new_crop_listing", (payload = {}) => {
      pushRealtimeNotification({
        type: "system",
        title: "New Crop Listed",
        message: `${payload.listing?.cropName || "A crop"} is now available in the marketplace.`,
        priority: "low",
        createdAt: payload.emittedAt
      });
      toast.success(`New listing: ${payload.listing?.cropName || "Crop"} added`, { duration: 3000 });
    });

    socket.on("price_drop_alert", (payload = {}) => {
      pushRealtimeNotification({
        type: "price_alert",
        title: "Price Drop Alert",
        message: `Price drop detected for ${payload.crop?.cropName || "a crop"}.`,
        priority: "high",
        createdAt: payload.emittedAt
      });
      toast(`📉 Price drop: ${payload.crop?.cropName || "Crop"} is now cheaper`, { duration: 4000 });
    });

    socket.on("new_message", (payload = {}) => {
      pushRealtimeNotification({
        type: "system",
        title: "New Message",
        message: "You have a new message from a farmer.",
        priority: "normal",
        createdAt: payload.emittedAt
      });
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("order_update");
      socket.off("new_crop_listing");
      socket.off("price_drop_alert");
      socket.off("new_message");
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
      setSocketConnected(false);
    };
  }, []);

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-wrap items-start justify-between gap-4"
        >
          <div>
            <p className="text-sm font-medium text-emerald-600 mb-1">{greetingByHour()}</p>
            <h1 className="text-2xl font-bold text-slate-900">
              {user?.name || "Buyer"}&apos;s Dashboard
            </h1>
            <p className="text-sm text-slate-500 mt-1">AI-powered market intelligence overview</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
            <Clock size={14} className="text-slate-400" />
            <span className="text-xs font-medium text-slate-600">{dateStr}</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 ml-1" />
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <Activity size={11} />
              Live
            </span>
          </div>
        </motion.div>

        {/* ── Section 1: Overview Cards ── */}
        <OverviewCards overview={overviewQuery.data} isLoading={overviewQuery.isLoading} />

        {/* ── Section 2: Price Trends ── */}
        <PriceTrendChart
          data={priceTrendsQuery.data}
          isLoading={priceTrendsQuery.isLoading}
          selectedCrop={selectedCrop || priceTrendsQuery.data?.crop || ""}
          onCropChange={setSelectedCrop}
          selectedDays={selectedDays}
          onDaysChange={setSelectedDays}
        />

        {/* ── Section 3: AI Recommendations ── */}
        <AIRecommendations
          recommendations={recommendationsQuery.data}
          isLoading={recommendationsQuery.isLoading}
        />

        {/* ── Section 4: Spending Analytics ── */}
        <SpendingAnalytics spending={spendingQuery.data} isLoading={spendingQuery.isLoading} />

        {/* ── Section 5: Favorite Crops ── */}
        <FavoriteCrops favoriteCrops={favoriteCropsQuery.data} isLoading={favoriteCropsQuery.isLoading} />

        {/* ── Section 6 + 7: Orders & Top Farmers ── */}
        <div className="grid gap-6 xl:grid-cols-2">
          <RecentOrders orders={recentOrdersQuery.data} isLoading={recentOrdersQuery.isLoading} />
          <TopFarmers farmers={topFarmersQuery.data} isLoading={topFarmersQuery.isLoading} />
        </div>

        {/* ── Section 8 + 9: AI Insights & Notifications ── */}
        <div className="grid gap-6 xl:grid-cols-2">
          <AIInsights
            insights={aiInsightsQuery.data}
            isLoading={aiInsightsQuery.isLoading}
            onRefresh={() => aiInsightsQuery.refetch()}
            isRefreshing={aiInsightsQuery.isFetching}
          />
          <NotificationsPanel
            notifications={notificationsQuery.data}
            isLoading={notificationsQuery.isLoading}
            realtimeNotifications={realtimeNotifications}
            isSocketConnected={isSocketConnected}
          />
        </div>

        {/* ── Section 10: Quick Actions ── */}
        <QuickActions />

        {/* ── Section 11: Expert Advisories ── */}
        <AdvisoryDashboardWidget role="buyer" />

      </div>
    </div>
  );
}
