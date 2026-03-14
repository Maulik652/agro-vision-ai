import React from "react";
import { motion } from "framer-motion";
import { BellRing } from "lucide-react";

const NotificationPanel = ({ notifications = [] }) => {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-xl"
    >
      <div className="mb-3 flex items-center gap-2">
        <BellRing className="h-5 w-5 text-amber-300" />
        <h2 className="text-lg font-bold text-white">Live Notifications</h2>
      </div>

      <ul className="space-y-2">
        {notifications.length ? notifications.map((note, index) => (
          <li key={`${note.type}-${index}`} className="rounded-lg border border-white/10 bg-slate-950/30 p-3">
            <p className="text-sm font-semibold text-white">{note.title}</p>
            <p className="text-xs text-slate-300">{note.message}</p>
            <p className="text-xs text-slate-400">{note.timestamp ? new Date(note.timestamp).toLocaleString() : "Just now"}</p>
          </li>
        )) : (
          <li className="rounded-lg border border-white/10 bg-slate-950/30 p-3 text-sm text-slate-400">No notifications yet.</li>
        )}
      </ul>
    </motion.section>
  );
};

export default NotificationPanel;
