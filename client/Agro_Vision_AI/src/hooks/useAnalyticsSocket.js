/**
 * useAnalyticsSocket — real-time analytics updates
 *
 * Connects to the main Socket.IO namespace and listens for:
 *   analytics_order_update  → invalidates analytics + orders queries
 *   analytics_wallet_update → invalidates wallet queries
 *   analytics_stats_update  → invalidates all analytics queries
 *   order_update            → invalidates orders (from dashboard events)
 *
 * React Query cache invalidation triggers automatic background refetch
 * so the Analytics page updates without any page refresh.
 */
import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export default function useAnalyticsSocket({ range, cropType } = {}) {
  const queryClient = useQueryClient();
  const socketRef   = useRef(null);

  const invalidateAnalytics = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["buyer-analytics"] });
    queryClient.invalidateQueries({ queryKey: ["analytics-insights"] });
  }, [queryClient]);

  const invalidateOrders = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["buyer-orders"] });
    queryClient.invalidateQueries({ queryKey: ["buyer-analytics"] });
  }, [queryClient]);

  const invalidateWallet = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["wallet"] });
    queryClient.invalidateQueries({ queryKey: ["wallet-transactions-all"] });
    queryClient.invalidateQueries({ queryKey: ["buyer-analytics"] });
  }, [queryClient]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    // Use the main namespace (same as dashboard events)
    const socket = io(SOCKET_URL, {
      auth:                { token },
      transports:          ["websocket", "polling"],
      reconnectionAttempts: 8,
      reconnectionDelay:   2000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      // Join buyer-specific room for targeted events
      const user = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; } })();
      if (user?._id) {
        socket.emit("join_buyer_room", { userId: user._id });
        socket.emit("subscribe_dashboard_events", { userId: user._id });
      }
    });

    // Order placed / status changed → refresh analytics + orders
    socket.on("analytics_order_update", invalidateOrders);

    // Wallet topped up / debited → refresh wallet + analytics
    socket.on("analytics_wallet_update", invalidateWallet);

    // Generic stats signal
    socket.on("analytics_stats_update", invalidateAnalytics);

    // Dashboard order_update (from emitOrderUpdate helper)
    socket.on("order_update", invalidateOrders);

    return () => {
      socket.off("analytics_order_update", invalidateOrders);
      socket.off("analytics_wallet_update", invalidateWallet);
      socket.off("analytics_stats_update",  invalidateAnalytics);
      socket.off("order_update",            invalidateOrders);
      socket.disconnect();
    };
  }, [invalidateAnalytics, invalidateOrders, invalidateWallet]);

  return socketRef;
}
