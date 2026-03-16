import { create } from "zustand";

/**
 * Payment page state — isolated from checkoutStore.
 * Handles: method selection, processing state, result.
 */
const usePaymentStore = create((set) => ({
  method: "razorpay",           // "razorpay" | "stripe" | "wallet"
  status: "idle",               // "idle" | "processing" | "success" | "failed"
  errorMessage: null,
  paymentId: null,

  setMethod:  (method)  => set({ method }),
  setStatus:  (status)  => set({ status }),
  setError:   (msg)     => set({ status: "failed", errorMessage: msg }),
  setSuccess: (paymentId) => set({ status: "success", paymentId, errorMessage: null }),
  reset:      ()        => set({ status: "idle", errorMessage: null, paymentId: null }),
}));

export default usePaymentStore;
