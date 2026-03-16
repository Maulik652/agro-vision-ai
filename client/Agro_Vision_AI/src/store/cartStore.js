/**
 * Cart Store — Zustand
 * Single source of truth for cart state on the client.
 * React Query handles server sync; this store holds UI state + optimistic updates.
 */
import { create } from "zustand";

const useCartStore = create((set, get) => ({
  // Server-synced cart data
  cart: null,
  isLoading: false,
  actionLoading: false, // per-item mutation in progress

  // UI state
  selectedItems: new Set(), // for future bulk-select
  promoCode: "",
  promoApplied: false,

  /* ── Setters ─────────────────────────────────────────────── */
  setCart: (cart) => set({ cart }),
  setLoading: (isLoading) => set({ isLoading }),
  setActionLoading: (actionLoading) => set({ actionLoading }),
  setPromoCode: (promoCode) => set({ promoCode }),

  /* ── Derived selectors ───────────────────────────────────── */
  getItemCount: () => {
    const { cart } = get();
    return cart?.items?.length ?? 0;
  },

  getTotalQuantity: () => {
    const { cart } = get();
    return cart?.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0;
  },

  isItemInCart: (cropId) => {
    const { cart } = get();
    return cart?.items?.some((i) => i.crop?.toString() === cropId?.toString()) ?? false;
  },

  getItemQuantity: (cropId) => {
    const { cart } = get();
    return cart?.items?.find((i) => i.crop?.toString() === cropId?.toString())?.quantity ?? 0;
  },

  /* ── Optimistic helpers ──────────────────────────────────── */
  optimisticUpdateQty: (cropId, quantity) => {
    const { cart } = get();
    if (!cart) return;
    const items = cart.items.map((i) =>
      i.crop?.toString() === cropId?.toString() ? { ...i, quantity } : i
    );
    set({ cart: { ...cart, items } });
  },

  optimisticRemove: (cropId) => {
    const { cart } = get();
    if (!cart) return;
    const items = cart.items.filter((i) => i.crop?.toString() !== cropId?.toString());
    set({ cart: { ...cart, items } });
  },

  clearStore: () => set({ cart: null, promoCode: "", promoApplied: false }),
}));

export default useCartStore;
