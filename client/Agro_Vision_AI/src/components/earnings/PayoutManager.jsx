import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Clock, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { releasePayout } from "../../api/earningsApi.js";

const PayoutManager = ({ data, loading, filters, onFilterChange }) => {
  const qc = useQueryClient();
  const payouts = data?.payouts || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;
  const page  = data?.page  || 1;

  const release = useMutation({
    mutationFn: (orderId) => releasePayout(orderId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["earnings-payouts"] }),
  });

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center gap-3">
        <h3 className="text-sm font-semibold text-slate-800 mr-auto">Farmer Payouts</h3>
        <span className="text-xs text-slate-400">{total.toLocaleString()} records</span>
        <select value={filters.status || ""} onChange={e => onFilterChange({ status: e.target.value, page: 1 })}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400">
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="released">Released</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {["Order ID","Farmer","City","Gross","Commission","Payable","Status","Action"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-3 bg-slate-100 rounded animate-pulse w-16" /></td>
                  ))}
                </tr>
              ))
            ) : payouts.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">No payouts found</td></tr>
            ) : payouts.map(p => (
              <tr key={p._id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono text-slate-600">{p.orderId || p._id?.toString().slice(-8)}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{p.farmer?.name || "—"}</td>
                <td className="px-4 py-3 text-slate-500">{p.farmer?.city || "—"}</td>
                <td className="px-4 py-3 text-slate-700">₹{p.grossAmount?.toLocaleString()}</td>
                <td className="px-4 py-3 text-violet-700">₹{p.commission?.toLocaleString()}</td>
                <td className="px-4 py-3 font-semibold text-blue-700">₹{p.payableAmount?.toLocaleString()}</td>
                <td className="px-4 py-3">
                  {p.escrowReleased ? (
                    <span className="flex items-center gap-1 text-emerald-700 text-[11px] font-semibold">
                      <CheckCircle size={11} /> Released
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-600 text-[11px] font-semibold">
                      <Clock size={11} /> Pending
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {!p.escrowReleased && (
                    <button
                      onClick={() => release.mutate(p._id)}
                      disabled={release.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-50">
                      {release.isPending ? <Loader2 size={10} className="animate-spin" /> : null}
                      Release
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

export default PayoutManager;
