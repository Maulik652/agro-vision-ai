import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Wallet, Lock, TrendingUp, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { fetchWalletOverview, fetchWalletTransactions } from "../../api/adminApi";

const CATEGORY_BADGE = {
  topup:                  "bg-green-100 text-green-700",
  order_payment:          "bg-blue-100 text-blue-700",
  consultation_payment:   "bg-purple-100 text-purple-700",
  refund:                 "bg-amber-100 text-amber-700",
  escrow_release:         "bg-emerald-100 text-emerald-700",
};

export default function WalletEscrowPage() {
  const [tab, setTab] = useState("overview");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["admin-wallet-overview"],
    queryFn: fetchWalletOverview,
    refetchInterval: 30000,
  });

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ["admin-wallet-txns", { category, type, page }],
    queryFn: () => fetchWalletTransactions({ category, type, page, limit: 30 }),
    enabled: tab === "transactions",
  });

  const stats = overview?.stats || {};
  const txns = txData?.data || [];
  const pages = txData?.pages || 1;

  const STAT_CARDS = [
    { label: "Total Wallet Balance", value: stats.totalBalance || 0, icon: Wallet, color: "from-blue-500 to-indigo-600" },
    { label: "In Escrow", value: stats.totalEscrow || 0, icon: Lock, color: "from-amber-500 to-orange-500" },
    { label: "Pending Payments", value: stats.totalPending || 0, icon: TrendingUp, color: "from-purple-500 to-violet-600" },
    { label: "Active Wallets", value: stats.count || 0, icon: Wallet, color: "from-green-500 to-emerald-600" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
          Wallet & Escrow Control
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Platform-wide wallet balances, escrow, and transaction ledger</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STAT_CARDS.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className={`rounded-2xl bg-gradient-to-br ${c.color} p-4 text-white`}>
            <c.icon size={18} className="mb-2 opacity-80" />
            <p className="text-xl font-bold">₹{(c.value || 0).toLocaleString("en-IN")}</p>
            <p className="text-xs opacity-80 mt-0.5">{c.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-2">
        {["overview", "transactions"].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition ${
              tab === t ? "bg-green-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}>
            {t === "overview" ? "Pending Escrow" : "Transaction Ledger"}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
              Pending Escrow Orders
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {["Order ID", "Farmer", "Buyer", "Amount", "Status", "Date"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {overviewLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                      ))}</tr>
                    ))
                  : (overview?.pendingEscrow || []).map((o) => (
                      <tr key={o._id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{o.orderId || o._id?.toString().slice(-8)}</td>
                        <td className="px-4 py-3 text-slate-700">{o.farmer?.name || "—"}</td>
                        <td className="px-4 py-3 text-slate-500">{o.buyer?.name || "—"}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-700">₹{(o.totalAmount || 0).toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                            Escrow Held
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{new Date(o.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                {!overviewLoading && !overview?.pendingEscrow?.length && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">No pending escrow</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "transactions" && (
        <>
          <div className="flex flex-wrap gap-3">
            <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none">
              <option value="">All Categories</option>
              {["topup","order_payment","consultation_payment","refund","escrow_release"].map((c) => (
                <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
              ))}
            </select>
            <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none">
              <option value="">All Types</option>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </select>
          </div>

          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {["User", "Type", "Category", "Amount", "Balance After", "Gateway", "Date"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {txLoading
                    ? Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                        ))}</tr>
                      ))
                    : txns.map((t) => (
                        <tr key={t._id} className="hover:bg-slate-50 transition">
                          <td className="px-4 py-3 text-slate-700">{t.user?.name || "—"}</td>
                          <td className="px-4 py-3">
                            <span className={`flex items-center gap-1 text-xs font-semibold ${t.type === "credit" ? "text-green-600" : "text-red-500"}`}>
                              {t.type === "credit" ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
                              {t.type}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${CATEGORY_BADGE[t.category] || "bg-slate-100 text-slate-600"}`}>
                              {t.category?.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className={`px-4 py-3 font-semibold ${t.type === "credit" ? "text-green-700" : "text-red-600"}`}>
                            {t.type === "credit" ? "+" : "-"}₹{(t.amount || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-3 text-slate-600">₹{(t.balanceAfter || 0).toLocaleString("en-IN")}</td>
                          <td className="px-4 py-3 text-slate-400 text-xs capitalize">{t.paymentGateway}</td>
                          <td className="px-4 py-3 text-slate-400 text-xs">{new Date(t.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <p className="text-xs text-slate-400">Page {page} of {pages}</p>
                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Prev</button>
                  <button disabled={page === pages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Next</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
