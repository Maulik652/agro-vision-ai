import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, UserPlus, CreditCard, ShieldAlert } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchLiveActivity } from "../../api/adminApi";

const TYPE_CONFIG = {
  order: { icon: ShoppingBag, color: "text-blue-500", bg: "bg-blue-50" },
  user: { icon: UserPlus, color: "text-green-500", bg: "bg-green-50" },
  payment: { icon: CreditCard, color: "text-emerald-500", bg: "bg-emerald-50" },
  fraud: { icon: ShieldAlert, color: "text-red-500", bg: "bg-red-50" },
};

export default function LiveActivityFeed() {
  const { data = [] } = useQuery({
    queryKey: ["admin-live-activity"],
    queryFn: fetchLiveActivity,
    refetchInterval: 10000,
  });

  return (
    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-800 text-sm" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
          Live Activity Stream
        </h3>
        <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Live
        </span>
      </div>
      <div className="space-y-2 max-h-72 overflow-y-auto">
        <AnimatePresence initial={false}>
          {data.map((item, i) => {
            const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.order;
            const Icon = cfg.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition"
              >
                <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={14} className={cfg.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">{item.message}</p>
                  <p className="text-[10px] text-slate-400">{new Date(item.time).toLocaleTimeString()}</p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {data.length === 0 && (
          <p className="text-center text-slate-400 text-xs py-8">No recent activity</p>
        )}
      </div>
    </div>
  );
}
