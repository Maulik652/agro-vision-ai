/**
 * TransactionList — paginated transaction history with category filter tabs
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Receipt } from "lucide-react";
import { fetchTransactions } from "../../services/walletAPI.js";
import TransactionItem from "./TransactionItem.jsx";

const FILTERS = [
  { value: "all",           label: "All" },
  { value: "topup",         label: "Top-ups" },
  { value: "order_payment", label: "Payments" },
  { value: "refund",        label: "Refunds" },
];

export default function TransactionList() {
  const [category, setCategory] = useState("all");
  const [page, setPage]         = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["wallet-transactions", category, page],
    queryFn:  () => fetchTransactions({ category, page, limit: 20 }),
    staleTime: 60_000,
    keepPreviousData: true,
  });

  const transactions = data?.transactions ?? [];
  const pagination   = data?.pagination;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
      {/* Header + filter tabs */}
      <div className="px-5 pt-5 pb-3 border-b border-slate-50">
        <div className="flex items-center gap-2 mb-3">
          <Receipt size={15} className="text-green-600" />
          <h3 className="text-slate-700 font-semibold text-sm">Transaction History</h3>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setCategory(f.value); setPage(1); }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all
                ${category === f.value
                  ? "bg-green-700 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="px-5">
        {isLoading && (
          <div className="space-y-3 py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse py-2">
                <div className="w-9 h-9 rounded-xl bg-slate-100 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                  <div className="h-2.5 bg-slate-50 rounded w-1/3" />
                </div>
                <div className="h-4 w-16 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center py-10 gap-3">
            <p className="text-slate-400 text-sm">Failed to load transactions</p>
            <button onClick={() => refetch()} className="text-green-700 text-xs font-semibold flex items-center gap-1">
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        )}

        {!isLoading && !isError && transactions.length === 0 && (
          <div className="flex flex-col items-center py-12 gap-2">
            <Receipt size={32} className="text-slate-200" />
            <p className="text-slate-400 text-sm">No transactions yet</p>
          </div>
        )}

        {!isLoading && transactions.map((tx, i) => (
          <TransactionItem key={tx._id} tx={tx} index={i} />
        ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-50">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-xs text-slate-500 hover:text-green-700 disabled:opacity-40 font-medium transition-colors"
          >
            ← Previous
          </button>
          <span className="text-xs text-slate-400">
            Page {page} of {pagination.pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
            disabled={page === pagination.pages}
            className="text-xs text-slate-500 hover:text-green-700 disabled:opacity-40 font-medium transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
