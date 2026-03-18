/**
 * useAdminSocket — real-time admin events
 *
 * Connects to /admin namespace and exposes:
 *   - liveActivities: prepended array of activity items (max 50)
 *   - realtimeNotifications: prepended array of notification items (max 30)
 *   - isConnected: socket connection status
 */
import { useEffect, useRef, useState } from "react";
import { connectAdminSocket } from "../realtime/adminSocket";

const MAX_ACTIVITIES = 50;
const MAX_NOTIFICATIONS = 30;

export default function useAdminSocket() {
  const [liveActivities, setLiveActivities] = useState([]);
  const [realtimeNotifications, setRealtimeNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const socket = connectAdminSocket(token);
    socketRef.current = socket;

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));

    socket.on("live_activity", (item) => {
      setLiveActivities((prev) => [item, ...prev].slice(0, MAX_ACTIVITIES));
    });

    socket.on("notification", (notif) => {
      setRealtimeNotifications((prev) => [notif, ...prev].slice(0, MAX_NOTIFICATIONS));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return { liveActivities, realtimeNotifications, isConnected };
}
