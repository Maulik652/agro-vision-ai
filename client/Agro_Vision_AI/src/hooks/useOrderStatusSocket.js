/**
 * useOrderStatusSocket
 * Listens for real-time order_update events from the server.
 * When admin changes an order status, this hook invalidates the
 * relevant React Query caches so buyer and farmer panels update instantly.
 *
 * Usage:
 *   useOrderStatusSocket({ queryKeys: ["buyer-orders"] })
 *   useOrderStatusSocket({ queryKeys: ["farmerOrders", "farmerMarketSummary"] })
 */
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import toast from "react-hot-toast";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export default function useOrderStatusSocket({ queryKeys = [], showToast = false } = {}) {
  const queryClient = useQueryClient();
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 6,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      const user = (() => {
        try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
      })();
      if (user?._id) {
        socket.emit("join_buyer_room", { userId: user._id });
        socket.emit("subscribe_dashboard_events", { userId: user._id });
      }
    });

    socket.on("order_update", (payload) => {
      // Invalidate all provided query keys
      queryKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });

      if (showToast && payload?.orderStatus) {
        toast(`Order status updated: ${payload.orderStatus}`, {
          icon: "📦",
          duration: 3000,
          style: { fontSize: "13px" },
        });
      }
    });

    return () => {
      socket.off("order_update");
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return socketRef;
}
