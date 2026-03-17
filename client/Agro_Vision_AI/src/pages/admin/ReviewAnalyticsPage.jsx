import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { fetchReviewAnalytics } from "../../api/adminApi";
import { Star, AlertTriangle, ThumbsUp, ThumbsDown } from "lucide-react";

const SENTIMENT_COLORS = { positive: "#22c55e", neutral: "#94a3b8", negative: "#ef4444" };
const RATING_COLORS = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"];

export default function ReviewAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-review-analytics"],
    queryFn: fetchReviewAnalytics,
  });

  const sentimentDist = data?.sentimentDist || [];
  const ratingDist = data?.ratingDist || [];
  const spamRisk = data?.spamRisk || [];
  const topReported = data?.topReported || [];

  const sentimentPie = sentimentDist.map((s) => ({
    name: s._id,
    value: s.count,
    fill: SENTIMENT_COLORS[s._id] || "#94a3b8",
  }));

  const ratingBar = [1, 2, 3, 4, 5].map((r) => ({
    rating: `${r}★`,
    count: ratingDist.find((d) => d._id === r)?.count || 0,
    fill: RATING_COLORS[r - 1],
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
          Review Analytics
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Sentiment analysis, spam detection & rating distribution</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Positive Reviews", value: sentimentDist.find((s) => s._id === "positive")?.count || 0, icon: ThumbsUp, color: "from-green-500 to-emerald-600" },
          { label: "Negative Reviews", value: sentimentDist.find((s) => s._id === "negative")?.count || 0, icon: ThumbsDown, color: "from-red-500 to-rose-600" },
          { label: "Spam Risk Flagged", value: spamRisk.length, icon: AlertTriangle, color: "from-amber-500 to-orange-500" },
        ].map(({ label, value, icon: Icon, color }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`rounded-2xl bg-gradient-to-br ${color} p-4 text-white`}>
            <Icon size={18} className="mb-2 opacity-80" />
            <p className="text-2xl font-bold">{isLoading ? "—" : value}</p>
            <p className="text-xs opacity-80 mt-0.5">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Sentiment Pie */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 mb-4 text-sm" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
            Sentiment Distribution
          </h3>
          {isLoading ? (
            <div className="h-48 bg-slate-100 rounded-xl animate-pulse" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={sentimentPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                    {sentimentPie.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2">
                {sentimentPie.map((s) => (
                  <span key={s.name} className="flex items-center gap-1 text-xs text-slate-500 capitalize">
                    <span className="w-2 h-2 rounded-full" style={{ background: s.fill }} />{s.name}
                  </span>
                ))}
              </div>
            </>
          )}
        </motion.div>

        {/* Rating Distribution Bar */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 mb-4 text-sm" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
            Rating Distribution
          </h3>
          {isLoading ? (
            <div className="h-48 bg-slate-100 rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ratingBar}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="rating" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {ratingBar.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Spam Risk + Top Reported */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Spam Risk */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-2" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
            <AlertTriangle size={14} className="text-amber-500" /> Spam Risk Reviews
          </h3>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />)}</div>
          ) : spamRisk.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No spam risk detected</p>
          ) : (
            <div className="space-y-2">
              {spamRisk.map((r) => (
                <div key={r._id} className="flex items-start justify-between p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{r.reviewer?.name || "Unknown"}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{r.comment?.slice(0, 60)}...</p>
                  </div>
                  <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-800 shrink-0">
                    {r.spamScore?.toFixed(2) || "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Top Reported */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-2" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
            <Star size={14} className="text-red-500" /> Top Reported Reviews
          </h3>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />)}</div>
          ) : topReported.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No reported reviews</p>
          ) : (
            <div className="space-y-2">
              {topReported.map((r) => (
                <div key={r._id} className="flex items-start justify-between p-3 rounded-xl bg-red-50 border border-red-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{r.reviewer?.name || "Unknown"}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{r.comment?.slice(0, 60)}...</p>
                  </div>
                  <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-200 text-red-800 shrink-0">
                    {r.reportCount} reports
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
