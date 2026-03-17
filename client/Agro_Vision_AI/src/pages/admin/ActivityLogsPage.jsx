import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Activity, Clock } from "lucide-react";
import { fetchActivityLogs } from "../../api/adminApi";

export default function ActivityLogsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-activity-logs", page],
    queryFn: () => fetchActivityLogs({ page, limit: 30 }),
  });

  const logs = data?.data || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
          Admin Action Log
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">{total} total actions recorded</p>
      </div>

      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-50">
          {isLoading
            ? Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-48 bg-slate-100 rounded animate-pulse" />
                    <div className="h-3 w-32 bg-slate-100 rounded animate-pulse" />
                  </div>
                </div>
              ))
            : logs.map((log, i) => (
                <motion.div
                  key={log._id || i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition"
                >
                  <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                    <Activity size={14} className="text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{log.action}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      by <span className="font-medium">{log.adminName}</span>
                      {log.target && <> · {log.target}</>}
                      {log.targetId && <span className="font-mono text-slate-400"> #{log.targetId.slice(-6)}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
                    <Clock size={11} />
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                </motion.div>
              ))}
          {!isLoading && logs.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">No activity logs yet</div>
          )}
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-400">Page {page} of {pages}</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Prev</button>
              <button disabled={page === pages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
