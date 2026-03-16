/**
 * Order Store — Zustand
 * Lightweight UI state for the Orders module.
 * React Query owns server data; this store owns filter/search UI state.
 */
import { create } from "zustand";

const useOrderStore = create((set) => ({
  statusFilter: "all",   // "all" | orderStatus value
  searchQuery: "",

  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setSearchQuery:  (searchQuery)  => set({ searchQuery }),
  reset: () => set({ statusFilter: "all", searchQuery: "" }),
}));

export default useOrderStore;
