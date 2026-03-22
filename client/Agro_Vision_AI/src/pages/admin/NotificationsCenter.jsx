import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Bell, CreditCard, Package, BrainCircuit, Users } from "lucide-react";
import { fetchNotificationsCenter } from "../../api/adminApi";

const TYPE_ICON = {
  payment: CreditCard,
  order: Package,
  ai: BrainCircuit,
  user: Users,
};

const TYPE_COLOR = {
  payment: "bg-emerald-50 text-emerald-600",
  order: "bg-blue-50 text-blue-600",
  ai: "bg-purple-50 text-purple-600",
  user: "bg-green-50 text-green-600",
};

export default function NotificationsCenter() {
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["admin-notifications-center"],
    queryFn: fetchNotificationsCenter,
    refetchInterval: 30000,
  });

  const grouped = notifications.reduce((acc, n) => {
    const type = n.type || "user";
    if (!acc[type]) acc[type] = [];
    acc[type].push(n);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
          Smart Notifications Center
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">{notifications.length} total notifications</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Bell size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No notifications</p>
        </div>
      ) : (
        Object.entries(grouped).map(([type, items]) => {
          const Icon = TYPE_ICON[type] || Bell;
          const colorClass = TYPE_COLOR[type] || "bg-slate-50 text-slate-600";
          return (
            <div key={type}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-7 h-7 rounded-lg ${colorClass} flex items-center justify-center`}>
                  <Icon size={13} />
                </div>
                <p className="text-sm font-semibold text-slate-700 capitalize">{type}</p>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-medium">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.slice(0, 5).map((n, i) => (
                  <motion.div
                    key={n._id || i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition"
                  >
                    <div className={`w-8 h-8 rounded-lg ${colorClass} flex items-center justify-center shrink-0`}>
                      <Icon size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{n.title || n.message}</p>
                      {n.message && n.message !== n.title && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{n.message}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                    </div>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-green-500 shrink-0 mt-1.5" />
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
