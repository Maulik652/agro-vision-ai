import { motion } from "framer-motion";
import { Eye, MousePointer, Users, TrendingUp, BarChart3, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getCropAnalytics } from "../../../api/farmerMarketplaceApi";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-[10px] font-bold text-slate-600 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} className="text-xs font-bold" style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function PerformanceAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ["farmerAnalytics"],
    queryFn: getCropAnalytics,
    staleTime: 60000,
    retry: 1,
  });

  const analytics = data?.analytics || [];

  const totals = analytics.reduce((acc, a) => ({
    views: acc.views + a.views,
    clicks: acc.clicks + a.clicks,
    interest: acc.interest + a.interest,
  }), { views: 0, clicks: 0, interest: 0 });

  const avgConversion = analytics.length
    ? (analytics.reduce((s, a) => s + a.conversion, 0) / analytics.length).toFixed(1)
    : 0;

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-8 w-8 rounded-xl bg-slate-200 animate-pulse" />
          <div className="h-5 w-40 rounded bg-slate-200 animate-pulse" />
        </div>
        <div className="h-48 rounded-xl bg-slate-100 animate-pulse mb-4" />
        {[1,2,3].map(i => <div key={i} className="mb-3 h-12 rounded-xl bg-slate-100 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100">
          <BarChart3 size={16} className="text-blue-600" />
        </div>
        <div>
          <h3 className="text-base font-black text-slate-800">Listing Performance</h3>
          <p className="text-[11px] text-slate-500">Views, clicks, buyer interest & conversion per crop</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Views",    value: totals.views,    icon: Eye,           color: "text-blue-700",   bg: "bg-blue-50" },
          { label: "Total Clicks",   value: totals.clicks,   icon: MousePointer,  color: "text-violet-700", bg: "bg-violet-50" },
          { label: "Buyer Interest", value: totals.interest, icon: Users,         color: "text-amber-700",  bg: "bg-amber-50" },
          { label: "Avg Conversion", value: `${avgConversion}%`, icon: TrendingUp, color: "text-emerald-700", bg: "bg-emerald-50" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl ${s.bg} p-3`}>
            <div className="flex items-center gap-1.5 mb-1">
              <s.icon size={13} className={s.color} />
              <p className="text-[10px] font-bold text-slate-500">{s.label}</p>
            </div>
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      {analytics.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-bold text-slate-700">Views vs Buyer Interest by Crop</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="cropName" tick={{ fontSize: 9, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="views"    name="Views"    fill="#3b82f6" radius={[3,3,0,0]} />
                <Bar dataKey="interest" name="Interest" fill="#f59e0b" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Per-crop table */}
      {analytics.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-bold text-slate-700">Per-Crop Breakdown</p>
          <div className="space-y-2">
            {analytics.map(a => (
              <div key={a._id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{a.cropName}</p>
                  <p className="text-[10px] text-slate-500">₹{a.price?.toLocaleString("en-IN")} · {a.status}</p>
                </div>
                <div className="flex gap-4 text-center shrink-0">
                  <div><p className="text-sm font-black text-blue-700">{a.views}</p><p className="text-[9px] text-slate-400">Views</p></div>
                  <div><p className="text-sm font-black text-violet-700">{a.clicks}</p><p className="text-[9px] text-slate-400">Clicks</p></div>
                  <div><p className="text-sm font-black text-amber-700">{a.interest}</p><p className="text-[9px] text-slate-400">Interest</p></div>
                  <div><p className="text-sm font-black text-emerald-700">{a.conversion}%</p><p className="text-[9px] text-slate-400">Conv.</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {analytics.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <BarChart3 size={28} className="text-slate-300" />
          <p className="text-sm font-semibold text-slate-500">No analytics yet</p>
          <p className="text-xs text-slate-400">Data appears once you have active listings</p>
        </div>
      )}
    </div>
  );
}
