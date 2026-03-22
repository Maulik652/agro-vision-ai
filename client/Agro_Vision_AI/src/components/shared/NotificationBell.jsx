import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, CheckCheck, Trash2, X, Loader2, AlertTriangle, CloudSun, TrendingUp, Bug, Sprout, ShieldAlert, Megaphone, Tag, Radio } from "lucide-react";
import { getNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification } from "../../api/farmerApi";
import useOfferSocket from "../../hooks/useOfferSocket";
import { connectBuyerDashboardSocket } from "../../realtime/dashboardSocket";
import toast from "react-hot-toast";

const ICON_MAP = {
  weather: CloudSun, pest: Bug, market: TrendingUp, crop: Sprout,
  alert: AlertTriangle, security: ShieldAlert, announcement: Megaphone,
  offer_accepted: Tag, offer_rejected: Tag,
};

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const ref = useRef(null);
  const socketRef = useRef(null);

  const unread = items.filter((n) => !n.read).length;

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const res = await getNotifications({ limit: 20 });
      if (res.success) setItems(res.notifications || []);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  // Initial fetch
  useEffect(() => { fetchNotifs(); }, []);

  // Real-time: connect to main namespace and listen for new_notification
  useEffect(() => {
    const token = localStorage.getItem("token");
    const socket = connectBuyerDashboardSocket(token);
    socketRef.current = socket;

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));

    // Server emits "new_notification" when a Notification doc is created for this user
    socket.on("new_notification", (notif) => {
      setItems((prev) => {
        if (prev.some((n) => String(n._id) === String(notif._id))) return prev;
        return [notif, ...prev];
      });
      toast(notif.title || notif.message || "New notification", { icon: "🔔" });
    });

    // Admin broadcast — insert as a synthetic bell item immediately
    socket.on("admin_broadcast", ({ title, message, type, emittedAt }) => {
      const syntheticNotif = {
        _id: `broadcast-${Date.now()}`,
        title,
        message,
        type: type || "announcement",
        read: false,
        createdAt: emittedAt || new Date().toISOString(),
      };
      setItems((prev) => [syntheticNotif, ...prev]);
      toast(
        (t) => (
          <div className="flex flex-col gap-0.5 max-w-xs">
            <p className="font-semibold text-sm text-slate-800">{title}</p>
            <p className="text-xs text-slate-600">{message}</p>
          </div>
        ),
        { icon: "📢", duration: 8000, id: `ab-${Date.now()}` }
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Real-time offer notifications
  useOfferSocket({
    offer_accepted: (payload) => {
      fetchNotifs();
      toast.success(payload.message || "Your offer was accepted!");
    },
    offer_rejected: (payload) => {
      fetchNotifs();
      toast.error(payload.message || "Your offer was rejected.");
    },
    offer_counter: (payload) => {
      fetchNotifs();
      toast(payload.message || "Farmer sent a counter offer", { icon: "🔄" });
    },
  });

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isSynthetic = (id) => String(id).startsWith("broadcast-");

  const handleRead = async (id) => {
    // Synthetic broadcast items have no DB doc — just mark locally
    if (isSynthetic(id)) {
      setItems((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
      return;
    }
    try {
      await markNotificationRead(id);
      setItems((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    } catch { /* silent */ }
  };

  const handleReadAll = async () => {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch { /* silent */ }
  };

  const handleDelete = async (id) => {
    // Synthetic items — just remove from local state
    if (isSynthetic(id)) {
      setItems((prev) => prev.filter((n) => n._id !== id));
      return;
    }
    try {
      await deleteNotification(id);
      setItems((prev) => prev.filter((n) => n._id !== id));
    } catch { /* silent */ }
  };

  const timeAgo = (d) => {
    const m = Math.floor((Date.now() - new Date(d)) / 60000);
    if (m < 1) return "Just now";
    if (m < 60) return `${m}m`;
    if (m < 1440) return `${Math.floor(m / 60)}h`;
    return `${Math.floor(m / 1440)}d`;
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => { setOpen(!open); if (!open) fetchNotifs(); }} className="relative p-2 rounded-lg hover:bg-white/10 transition">
        <Bell size={18} className="text-white" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 text-[10px] font-bold text-white rounded-full flex items-center justify-center leading-none">{unread > 9 ? "9+" : unread}</span>
        )}
        {isConnected && (
          <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 border border-slate-900" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-white/10 rounded-xl shadow-2xl shadow-black/40 overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">Notifications</span>
              <Radio size={10} className={isConnected ? "text-emerald-400 animate-pulse" : "text-slate-600"} />
            </div>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={handleReadAll} className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                  <CheckCheck size={12} /> Read All
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/10 rounded"><X size={14} className="text-slate-400" /></button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto">
            {loading && <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>}
            {!loading && items.length === 0 && (
              <div className="py-8 text-center text-slate-500 text-xs">No notifications</div>
            )}
            {!loading && items.map((n) => {
              const NIcon = ICON_MAP[n.type] || Bell;
              return (
                <div key={n._id} className={`flex items-start gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition ${!n.read ? "bg-emerald-900/10" : ""}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${!n.read ? "bg-emerald-500/20" : "bg-white/5"}`}>
                    <NIcon size={14} className={!n.read ? "text-emerald-400" : "text-slate-500"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs leading-snug ${!n.read ? "text-white font-medium" : "text-slate-400"}`}>{n.title || n.message}</p>
                    {n.message && n.title && <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>}
                    <span className="text-[10px] text-slate-600 mt-1 block">{timeAgo(n.createdAt)}</span>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {!n.read && (
                      <button onClick={() => handleRead(n._id)} className="p-1 rounded hover:bg-white/10" title="Mark read">
                        <Check size={12} className="text-emerald-400" />
                      </button>
                    )}
                    <button onClick={() => handleDelete(n._id)} className="p-1 rounded hover:bg-white/10" title="Delete">
                      <Trash2 size={12} className="text-slate-600 hover:text-red-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
