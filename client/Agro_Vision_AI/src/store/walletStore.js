/**
 * Wallet Store — Zustand
 * Holds UI state for the add-money modal and gateway flow.
 * React Query owns server data (balance, transactions).
 */
import { create } from "zustand";

const useWalletStore = create((set) => ({
  showAddMoney: false,
  addAmount:    "",
  gateway:      "razorpay",   // "razorpay" | "stripe"
  topupStatus:  "idle",       // "idle" | "processing" | "success" | "failed"
  errorMsg:     null,

  openAddMoney:  ()        => set({ showAddMoney: true, topupStatus: "idle", errorMsg: null }),
  closeAddMoney: ()        => set({ showAddMoney: false, addAmount: "", topupStatus: "idle" }),
  setAddAmount:  (v)       => set({ addAmount: v }),
  setGateway:    (g)       => set({ gateway: g }),
  setStatus:     (s, msg)  => set({ topupStatus: s, errorMsg: msg ?? null }),
}));

export default useWalletStore;
