import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Search, Filter } from "lucide-react";

const STATUS_COLORS = {
  paid:    "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  failed:  "bg-red-100 text-red-700",
  refunded:"bg-slate-100 text-slate-600",
  created: "bg-amber-100 text-amber-700",
  attempted:"bg-orange-100 text-orange-700",
};

const TYPE_BADGE = {
  order:        "bg-blue-100 text-blue-700",
  consultation: "bg-violet-100 text-violet-700",
};

const TransactionTable = ({ data, loading, filters, onFilterChange }) => {
  const transactions = data?.transactions || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;
  const page  = data?.page  || 1;

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
      {/* Table header + filters */}
      <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
        <h3 className="text-sm font-semibold text-slate-800 mr-auto">Transactions</h3>
        <span className="text-xs text-slate-400">{total.toLocaleString()} total</span>

        <select value={filters.type || ""} onChange={e => onFilterChange({ type: e.target.value, page: 1 })}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400">
          <option value="">All Types</option>
          <option value="order">Orders</option>
          <option value="consultation">Consultations</option>
        </select>

        <select value={filters.status || ""} onChange={e => onFilterChange({ status: e.target.value, page: 1 })}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400">
          <option value="">All Status</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>

        <select value={filters.method || ""} onChange={e => onFilterChange({ method: e.target.value, page: 1 })}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400">
          <option value="">All Methods</option>
          <option value="razorpay">Razorpay</option>
          <option value="stripe">Stripe</option>
          <option value="direct">Direct</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {["Type","TX ID","Payer","Expert/Recipient","Description","Amount","Commission","Method","Status","Date"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  {Array.from({ length: 10 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-3 bg-slate-100 rounded animate-pulse w-16" /></td>
                  ))}
                </tr>
              ))
            ) : transactions.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-slate-400">No transactions found</td></tr>
            ) : transactions.map(t => (
              <tr key={t._id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${TYPE_BADGE[t.type] || "bg-slate-100 text-slate-600"}`}>
                    {t.type}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">{t.txId}</td>
                <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                  {t.payer?.name || "—"}
                  {t.payerRole && <span className="ml-1 text-[10px] text-slate-400 capitalize">({t.payerRole})</span>}
                </td>
                <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{t.recipient?.name || "—"}</td>
                <td className="px-4 py-3 text-slate-500 max-w-[160px] truncate">{t.description}</td>
                <td className="px-4 py-3 font-semibold text-slate-800">₹{t.amount?.toLocaleString()}</td>
                <td className="px-4 py-3 text-violet-700">{t.commission > 0 ? `₹${t.commission?.toLocaleString()}` : "—"}</td>
                <td className="px-4 py-3 text-slate-500 capitalize">{t.paymentMethod || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[t.paymentStatus] || "bg-slate-100 text-slate-600"}`}>
                    {t.paymentStatus}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{new Date(t.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">Page {page} of {pages}</span>
          <div className="flex gap-1">
            <button onClick={() => onFilterChange({ page: page - 1 })} disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors">
              <ChevronLeft size={13} />
            </button>
            <button onClick={() => onFilterChange({ page: page + 1 })} disabled={page >= pages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors">
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionTable;
