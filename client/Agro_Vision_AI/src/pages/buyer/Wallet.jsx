/**
 * Wallet Page — AgroVision AI Buyer Panel
 * Route: /buyer/wallet
 *
 * Shows balance card, stats summary, transaction history, and add-money modal.
 * React Query handles server data; Zustand handles modal UI state.
 */
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Wallet as WalletIcon, ShieldCheck } from "lucide-react";

import { fetchWallet, fetchTransactions } from "../../services/walletAPI.js";
import useWalletStore from "../../store/walletStore.js";

import WalletBalanceCard from "../../components/wallet/WalletBalanceCard.jsx";
import WalletStatsRow    from "../../components/wallet/WalletStatsRow.jsx";
import TransactionList   from "../../components/wallet/TransactionList.jsx";
import AddMoneyModal     from "../../components/wallet/AddMoneyModal.jsx";

export default function Wallet() {
  const { openAddMoney } = useWalletStore();

  /* ── Wallet balance ─────────────────────────────────────── */
  const { data: wallet, isLoading: balanceLoading } = useQuery({
    queryKey: ["wallet"],
    queryFn:  fetchWallet,
    staleTime: 120_000,
  });

  /* ── All transactions for stats row (first 100) ─────────── */
  const { data: txData } = useQuery({
    queryKey: ["wallet-transactions-all"],
    queryFn:  () => fetchTransactions({ page: 1, limit: 100, category: "all" }),
    staleTime: 120_000,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef]">
      {/* Page header */}
      <div className="bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
            <WalletIcon size={18} className="text-green-700" />
          </div>
          <div>
            <h1 className="text-slate-900 font-bold text-lg">My Wallet</h1>
            <p className="text-slate-400 text-xs">Manage your balance and transactions</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-5">
        {/* Balance card */}
        <WalletBalanceCard
          balance={wallet?.balance}
          isLoading={balanceLoading}
          onAddMoney={openAddMoney}
        />

        {/* Stats row */}
        <WalletStatsRow transactions={txData?.transactions ?? []} />

        {/* Wallet info strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-2xl px-5 py-3"
        >
          <ShieldCheck size={16} className="text-green-600 shrink-0" />
          <p className="text-green-700 text-xs">
            Wallet balance can be used at checkout. Refunds from cancelled orders are credited here automatically.
          </p>
        </motion.div>

        {/* Transaction history */}
        <TransactionList />
      </div>

      {/* Add money modal */}
      <AddMoneyModal />
    </div>
  );
}
