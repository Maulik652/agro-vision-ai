/**
 * useOfferSocket
 * Listens for real-time offer events:
 *   - new_offer        → farmer: new offer arrived
 *   - offer_accepted   → buyer: their offer was accepted
 *   - offer_rejected   → buyer: their offer was rejected
 *   - offer_counter    → buyer: farmer sent a counter offer
 *   - offer_responded  → farmer: offer was responded to (refresh list)
 */
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export default function useOfferSocket(handlers = {}) {
  const socketRef = useRef(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const token = localStorage.getItem("token");
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    const events = ["new_offer", "offer_accepted", "offer_rejected", "offer_counter", "offer_responded", "new_order", "order_paid"];
    events.forEach((evt) => {
      socket.on(evt, (payload) => handlersRef.current?.[evt]?.(payload));
    });

    return () => socket.disconnect();
  }, []);
}
