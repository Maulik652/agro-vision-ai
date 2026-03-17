import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { fetchFinancialStats } from "../../api/adminApi";
import StatsCard from "../../components/admin/StatsCard";
import { CreditCard, TrendingDown, RefreshCcw, Wallet } from "lucide-react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function PaymentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-financial"],
    queryFn: fetchFinancialStats,
    refetchInterval: 60000,
  });

  const revenueChart = (data?.monthlyRevenue || []).reverse().map((r) => ({
    name: MONTHS[(r._id?.month || 1) - 1],
    revenue: r.revenue,
    count: r.count,
  }));

  const CARDS = [
    { label: "Total Revenue", value: data?.totalRevenue || 0, icon: CreditCard, gradient: "from-emerald-500 to-teal-600", format: (v) => `₹${v.toLocaleString("en-IN")}` },
    { label: "Transactions", value: data?.totalTransactions || 0, icon: Wallet, gradient: "from-blue-500 to-indigo-600" },
    { label: "Total Refunds", value: data?.totalRefunds || 0, icon: TrendingDown, gradient: "from-red-500 to-rose-600", format: (v) => `₹${v.toLocaleString("en-IN")}` },
    { label: "Refund Count", value: data?.refundCount || 0, icon: RefreshCcw, gradient: "from-amber-500 to-orange-500" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
          Financial Control Center
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Revenue, transactions, and refund analytics</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {CARDS.map((c, i) => <StatsCard key={c.label} {...c} index={i} isLoading={isLoading} />)}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5"
      >
        <h3 className="font-bold text-slate-800 mb-4 text-sm" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
          Monthly Revenue Trend
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={revenueChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => [`₹${v.toLocaleString("en-IN")}`, "Revenue"]} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
            <Line type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 4, fill: "#16a34a" }} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-sm" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
            Recent Transactions
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {["Transaction ID", "User", "Amount", "Method", "Status", "Date"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                    ))}</tr>
                  ))
                : (data?.recentTransactions || []).map((t) => (
                    <tr key={t._id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{t.razorpayPaymentId || t._id?.toString().slice(-10)}</td>
                      <td className="px-4 py-3 text-slate-700">{t.user?.name || "—"}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">₹{(t.amount || 0).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-slate-500 capitalize">{t.method || "razorpay"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          t.status === "captured" ? "bg-green-100 text-green-700" :
                          t.status === "refunded" ? "bg-red-100 text-red-700" :
                          "bg-amber-100 text-amber-700"
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{new Date(t.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
