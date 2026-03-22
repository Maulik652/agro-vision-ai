import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Users, Sprout, ShoppingBag, Package, CreditCard,
  BrainCircuit, TrendingUp, Activity,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { fetchAdminDashboard } from "../../api/adminApi";
import StatsCard from "../../components/admin/StatsCard";
import LiveActivityFeed from "../../components/admin/LiveActivityFeed";
import AlertsPanel from "../../components/admin/AlertsPanel";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const fmtRevenue = (v) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: fetchAdminDashboard,
    refetchInterval: 30000,
  });

  const stats = data?.stats || {};

  const revenueChart = (data?.revenueByMonth || []).map((r) => ({
    name: MONTHS[(r._id?.month || 1) - 1],
    revenue: r.revenue,
    orders: r.count,
  }));

  const userChart = (data?.userGrowth || []).map((u) => ({
    name: MONTHS[(u._id?.month || 1) - 1],
    users: u.count,
  }));

  const CARDS = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, gradient: "from-blue-500 to-indigo-600", change: 12 },
    { label: "Active Farmers", value: stats.farmers, icon: Sprout, gradient: "from-green-500 to-emerald-600", change: 8 },
    { label: "Buyers", value: stats.buyers, icon: ShoppingBag, gradient: "from-purple-500 to-violet-600", change: 15 },
    { label: "Total Orders", value: stats.totalOrders, icon: Package, gradient: "from-orange-500 to-amber-500", change: 6 },
    { label: "Total Revenue", value: stats.totalRevenue, icon: CreditCard, gradient: "from-emerald-500 to-teal-600", change: 18, format: (v) => `₹${v.toLocaleString("en-IN")}` },
    { label: "AI Scans", value: stats.aiScans, icon: BrainCircuit, gradient: "from-pink-500 to-rose-500", change: 24 },
    { label: "Active Listings", value: stats.activeListings, icon: TrendingUp, gradient: "from-cyan-500 to-blue-500", change: 5 },
    { label: "Pending Orders", value: stats.pendingOrders, icon: Activity, gradient: "from-amber-500 to-orange-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
          Command Center
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Real-time platform overview — AgroVision AI</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {CARDS.map((card, i) => (
          <StatsCard key={card.label} {...card} index={i} isLoading={isLoading} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5"
        >
          <h3 className="font-bold text-slate-800 mb-4 text-sm" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
            Revenue Growth
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={revenueChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmtRevenue(v)} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Line type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* User Growth Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5"
        >
          <h3 className="font-bold text-slate-800 mb-4 text-sm" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
            User Growth
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={userChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Bar dataKey="users" fill="#16a34a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="lg:col-span-2 rounded-2xl bg-white border border-slate-100 shadow-sm p-5"
        >
          <h3 className="font-bold text-slate-800 mb-4 text-sm" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
            Recent Orders
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100">
                  <th className="text-left pb-2 font-medium">Order ID</th>
                  <th className="text-left pb-2 font-medium">Buyer</th>
                  <th className="text-left pb-2 font-medium">Amount</th>
                  <th className="text-left pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(data?.recentOrders || []).map((o) => (
                  <tr key={o._id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 font-mono text-slate-600">#{o._id?.toString().slice(-6)}</td>
                    <td className="py-2.5 text-slate-700">{o.buyer?.name || "—"}</td>
                    <td className="py-2.5 font-semibold text-slate-800">₹{(o.totalAmount || 0).toLocaleString("en-IN")}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        o.orderStatus === "delivered" ? "bg-green-100 text-green-700" :
                        o.orderStatus === "pending_payment" || o.orderStatus === "pending" ? "bg-amber-100 text-amber-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>
                        {o.orderStatus}
                      </span>
                    </td>
                  </tr>
                ))}
                {!data?.recentOrders?.length && (
                  <tr><td colSpan={4} className="py-6 text-center text-slate-400">No orders yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Live Activity */}
        <LiveActivityFeed />
      </div>
    </div>
  );
}
