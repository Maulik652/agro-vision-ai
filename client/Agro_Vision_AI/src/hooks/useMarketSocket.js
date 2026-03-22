/**
 * useMarketSocket — singleton socket for buyer marketplace real-time events.
 * All hooks (useStockSocket, useOfferSocket) share this one connection
 * instead of each creating their own io() instance.
 */
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

// Module-level singleton
let _socket = null;
let _refCount = 0;
const _listeners = new Map(); // eventName → Set of callbacks

function getSocket() {
  if (!_socket || _socket.disconnected) {
    const token = localStorage.getItem("token");
    _socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    // Re-attach all registered listeners after reconnect
    _socket.on("connect", () => {
      _listeners.forEach((cbs, event) => {
        cbs.forEach((cb) => _socket.off(event, cb).on(event, cb));
      });
    });
  }
  return _socket;
}

function addListener(event, cb) {
  if (!_listeners.has(event)) _listeners.set(event, new Set());
  _listeners.get(event).add(cb);
  getSocket().on(event, cb);
}

function removeListener(event, cb) {
  _listeners.get(event)?.delete(cb);
  _socket?.off(event, cb);
}

/**
 * useMarketSocket(handlers)
 * handlers: { eventName: (payload) => void, ... }
 * Returns the shared socket instance.
 */
export default function useMarketSocket(handlers = {}) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    _refCount++;
    const socket = getSocket();

    // Stable wrapper per event so we can remove them on cleanup
    const wrappers = {};
    Object.keys(handlers).forEach((event) => {
      const wrapper = (payload) => handlersRef.current[event]?.(payload);
      wrappers[event] = wrapper;
      addListener(event, wrapper);
    });

    return () => {
      Object.entries(wrappers).forEach(([event, wrapper]) => {
        removeListener(event, wrapper);
      });
      _refCount--;
      // Disconnect only when no consumers remain
      if (_refCount <= 0 && _socket) {
        _socket.disconnect();
        _socket = null;
        _refCount = 0;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return getSocket();
}
