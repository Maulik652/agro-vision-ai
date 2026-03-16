import api from "../api/axios.js";

const unwrap = (res) => res.data?.data ?? res.data;

/** GET /api/payments/summary/:parentOrderId */
export const fetchPaymentSummary = (parentOrderId) =>
  api.get(`/payments/summary/${parentOrderId}`).then(unwrap);

/** Create gateway order (Razorpay or Stripe) */
export const createPaymentOrder = (body) =>
  api.post("/payments/create-order", body).then(unwrap);

/** Verify payment after gateway callback */
export const verifyPayment = (body) =>
  api.post("/payments/verify", body).then(unwrap);

/**
 * Load Razorpay checkout SDK dynamically.
 * Returns a promise that resolves when the script is ready.
 */
export const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

/**
 * Open Razorpay checkout modal.
 * @param {object} options - { gatewayOrderId, amount, currency, keyId, name, description, prefill }
 * @returns Promise<{ razorpay_order_id, razorpay_payment_id, razorpay_signature }>
 */
export const openRazorpay = (options) =>
  new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key:         options.keyId ?? import.meta.env.VITE_RAZORPAY_KEY_ID,
      order_id:    options.gatewayOrderId,
      amount:      Math.round(options.amount * 100),
      currency:    options.currency ?? "INR",
      name:        options.name ?? "AgroVision AI",
      description: options.description ?? "Crop Purchase",
      prefill:     options.prefill ?? {},
      theme:       { color: "#15803d" },
      handler:     (response) => resolve(response),
      modal:       { ondismiss: () => reject(new Error("Payment cancelled")) },
    });
    rzp.open();
  });
