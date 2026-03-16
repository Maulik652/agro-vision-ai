import { create } from "zustand";

const useCheckoutStore = create((set, get) => ({
  // Step: "summary" | "address" | "payment" | "processing" | "success"
  step: "summary",

  selectedAddressId: null,
  deliveryType: "standard",       // "standard" | "express"
  paymentMethod: "razorpay",      // "razorpay" | "stripe" | "wallet"

  // Set after order creation
  parentOrderId: null,
  grandTotal: 0,
  placedOrders: [],

  setStep:             (step)            => set({ step }),
  setSelectedAddress:  (id)              => set({ selectedAddressId: id }),
  setDeliveryType:     (type)            => set({ deliveryType: type }),
  setPaymentMethod:    (method)          => set({ paymentMethod: method }),
  setOrderResult:      (parentOrderId, grandTotal, orders) =>
    set({ parentOrderId, grandTotal, placedOrders: orders }),

  reset: () => set({
    step: "summary", selectedAddressId: null,
    deliveryType: "standard", paymentMethod: "razorpay",
    parentOrderId: null, grandTotal: 0, placedOrders: [],
  }),
}));

export default useCheckoutStore;
