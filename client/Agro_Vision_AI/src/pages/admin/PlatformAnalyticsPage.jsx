import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { fetchPlatformAnalytics } from "../../api/adminApi";
import { Users, ShoppingBag, MessageSquare, TrendingUp } from "lucide-react";

const ROLE_COLORS = ["#16a34a", "#3b82f6", "#f59e0b", "#8b5cf6"];
const STATUS_COLORS = ["#22c55e", "#f97316", "#ef4444", "#94a3b8", "#3b82f6"];

export default function PlatformAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-platform-analytics"],
    queryFn: fetchPlatformAnalytics,
  });

  const usersByRole = data?.usersByRole || [];
  const ordersByStatus = data?.ordersByStatus || [];
  const consultationsByStatus = data?.consultationsByStatus || [];
  const topCrops = data?.topCrops || [];
  const revenueByGateway = data?.revenueByGateway || [];

  const userPie = usersByRole.map((u, i) => ({ name: u._id, value: u.count, fill: ROLE_COLORS[i % ROLE_COLORS.length] }));
  const orderBar = ordersByStatus.map((o, i) => ({ status: o._id, count: o.count, fill: STATUS_COLORS[i % STATUS_COLORS.length] }));
  const consultBar = consultationsByStatus.map((c, i) => ({ status: c._id, count: c.count, fill: STATUS_COLORS[i % STATUS_COLORS.length] }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
          Platform Analytics
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Full platform health — users, orders, consultations, crops & revenue</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: usersByRole.reduce((a, u) => a + u.count, 0), icon: Users, color: "from-green-500 to-emerald-600" },
          { label: "Total Orders", value: ordersByStatus.reduce((a, o) => a + o.count, 0), icon: ShoppingBag, color: "from-blue-500 to-indigo-600" },
          { label: "Consultations", value: consultationsByStatus.reduce((a, c) => a + c.count, 0), icon: MessageSquare, color: "from-purple-500 to-violet-600" },
          { label: "Top Crop Listings", value: topCrops.length, icon: TrendingUp, color: "from-amber-500 to-orange-500" },
        ].map(({ label, value, icon: Icon, color }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`rounded-2xl bg-gradient-to-br ${color} p-4 text-white`}>
            <Icon size={18} className="mb-2 opacity-80" />
            <p className="text-2xl font-bold">{isLoading ? "—" : value}</p>
            <p className="text-xs opacity-80 mt-0.5">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Users by Role + Orders by Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 mb-4 text-sm" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
            Users by Role
          </h3>
          {isLoading ? <div className="h-48 bg-slate-100 rounded-xl animate-pulse" /> : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={userPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                    {userPie.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2 flex-wrap">
                {userPie.map((u) => (
                  <span key={u.name} className="flex items-center gap-1 text-xs text-slate-500 capitalize">
                    <span className="w-2 h-2 rounded-full" style={{ background: u.fill }} />{u.name}
                  </span>
                ))}
              </div>
            </>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 mb-4 text-sm" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
            Orders by Status
          </h3>
          {isLoading ? <div className="h-48 bg-slate-100 rounded-xl animate-pulse" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={orderBar}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="status" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {orderBar.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Consultations by Status + Revenue by Gateway */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 mb-4 text-sm" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
            Consultations by Status
          </h3>
          {isLoading ? <div className="h-48 bg-slate-100 rounded-xl animate-pulse" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={consultBar}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="status" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {consultBar.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 mb-4 text-sm" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
            Revenue by Payment Gateway
          </h3>
          {isLoading ? <div className="h-48 bg-slate-100 rounded-xl animate-pulse" /> : (
            <div className="space-y-3">
              {revenueByGateway.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No revenue data</p>
              ) : revenueByGateway.map((g, i) => (
                <div key={g._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: ROLE_COLORS[i % ROLE_COLORS.length] }} />
                    <span className="text-sm font-medium text-slate-700 capitalize">{g._id || "Unknown"}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">₹{g.total?.toLocaleString("en-IN") || 0}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Top Crops Table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-sm" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
            Top Crops by Listings
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {["#", "Crop Name", "Total Listings", "Avg Price (₹)", "Total Sold (kg)"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                    ))}</tr>
                  ))
                : topCrops.map((c, i) => (
                    <tr key={c._id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 text-slate-400 text-xs font-medium">{i + 1}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{c._id}</td>
                      <td className="px-4 py-3 text-slate-600">{c.count}</td>
                      <td className="px-4 py-3 text-slate-600">₹{c.avgPrice?.toFixed(2) || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{c.totalSold?.toFixed(0) || "—"}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
