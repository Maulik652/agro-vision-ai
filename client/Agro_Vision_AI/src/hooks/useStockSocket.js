/**
 * useStockSocket
 * Subscribes to real-time `stock_update` events from the server.
 * Calls onStockUpdate({ cropId, quantity, outOfStock }) whenever
 * a buyer places an order and stock changes.
 */
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export default function useStockSocket(onStockUpdate) {
  const socketRef = useRef(null);
  const cbRef = useRef(onStockUpdate);
  cbRef.current = onStockUpdate;

  useEffect(() => {
    const token = localStorage.getItem("token");
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on("stock_update", (payload) => {
      cbRef.current?.(payload);
    });

    return () => {
      socket.disconnect();
    };
  }, []);
}
