import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { BarChart2, Loader2, TrendingUp, Award } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { fetchAdvisoryAnalytics } from "../../api/advisoryApi";

const CATEGORY_COLORS = {
  crop:       "#16a34a",
  market:     "#2563eb",
  disease:    "#dc2626",
  weather:    "#0891b2",
  pest:       "#ea580c",
  irrigation: "#0284c7",
  general:    "#64748b",
};

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="text-slate-500 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold capitalize">
          {p.name}: {Math.round(p.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
};

export default function AdvisoryAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ["advisory-analytics"],
    queryFn: fetchAdvisoryAnalytics,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-emerald-500" />
      </div>
    );
  }

  const trend          = data?.trend        || [];
  const byCategory     = data?.byCategory   || {};
  const topAdvisories  = (data?.advisories  || []).slice(0, 5);
  const categoryData   = Object.entries(byCategory).map(([name, views]) => ({ name, views }));

  return (
    <div className="space-y-4">

      {/* Trend chart */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-slate-200 rounded-xl shadow-sm p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={14} className="text-emerald-600" />
          <h3 className="text-sm font-semibold text-slate-900">7-Day Engagement Trend</h3>
        </div>
        {trend.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-slate-400 text-xs">No trend data</div>
        ) : (
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip content={<Tip />} />
                <Line type="monotone" dataKey="views"  stroke="#16a34a" strokeWidth={2} dot={false} name="Views" />
                <Line type="monotone" dataKey="clicks" stroke="#2563eb" strokeWidth={2} dot={false} name="Clicks" strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </motion.div>

      {/* Category breakdown */}
      {categoryData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="bg-white border border-slate-200 rounded-xl shadow-sm p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={14} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-900">Views by Category</h3>
          </div>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} barSize={24} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip content={<Tip />} />
                <Bar dataKey="views" radius={[4, 4, 0, 0]}>
                  {categoryData.map(entry => (
                    <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || "#64748b"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Top performing */}
      {topAdvisories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="bg-white border border-slate-200 rounded-xl shadow-sm p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Award size={14} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-900">Top Performing</h3>
          </div>
          <div className="space-y-2.5">
            {topAdvisories.map((a, i) => {
              const maxViews = topAdvisories[0]?.views || 1;
              const pct = Math.round(((a.views || 0) / maxViews) * 100);
              return (
                <div key={a._id} className="flex items-center gap-3">
                  <span className={`text-xs font-bold w-5 shrink-0 ${i === 0 ? "text-amber-500" : "text-slate-400"}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate">{a.title}</p>
                    <div className="mt-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-slate-900">{(a.views || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400">views</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
