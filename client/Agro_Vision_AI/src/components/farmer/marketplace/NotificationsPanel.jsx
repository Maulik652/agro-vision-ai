import { motion } from "framer-motion";
import { Bell, HandCoins, ShoppingCart, DollarSign, Package, X, CheckCheck, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getNotifications, markAllRead } from "../../../api/farmerMarketplaceApi";

const TYPE_CONFIG = {
  new_offer: { icon: HandCoins, color: "text-amber-600", bg: "bg-amber-50" },
  new_order: { icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50" },
  payment_received: { icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
  order_update: { icon: Package, color: "text-violet-600", bg: "bg-violet-50" },
  default: { icon: Bell, color: "text-slate-600", bg: "bg-slate-50" },
};

export default function NotificationsPanel({ onClose }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["farmerNotifications"],
    queryFn: getNotifications,
    staleTime: 15000,
    retry: 1,
  });

  const { mutate: markRead, isPending: marking } = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["farmerNotifications"] }); toast.success("All marked as read"); },
  });

  const notifications = data?.notifications || data || [];
  const unread = data?.unread || notifications.filter((n) => !n.read).length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-slate-600" />
          <span className="text-sm font-black text-slate-800">Notifications</span>
          {unread > 0 && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white">{unread}</span>}
        </div>
        <div className="flex items-center gap-1">
          {unread > 0 && (
            <button onClick={() => markRead()} disabled={marking} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 transition">
              <CheckCheck size={10} /> Mark all read
            </button>
          )}
          {onClose && <button onClick={onClose} className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition"><X size={12} /></button>}
        </div>
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 size={14} className="animate-spin text-slate-400" />
            <span className="text-xs text-slate-400">Loading...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10">
            <Bell size={20} className="text-slate-300" />
            <p className="text-xs text-slate-400">No notifications</p>
          </div>
        ) : (
          notifications.map((n) => {
            const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.default;
            const Icon = cfg.icon;
            return (
              <motion.div key={n._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`flex items-start gap-3 border-b border-slate-50 px-4 py-3 transition hover:bg-slate-50 ${!n.read ? "bg-blue-50/30" : ""}`}>
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${cfg.bg}`}>
                  <Icon size={13} className={cfg.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold text-slate-800 ${!n.read ? "font-bold" : ""}`}>{n.title || n.message}</p>
                  {n.title && n.message && <p className="text-[10px] text-slate-500 mt-0.5">{n.message}</p>}
                  <p className="text-[9px] text-slate-400 mt-0.5">{new Date(n.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
