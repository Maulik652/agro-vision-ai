import api from "../api/axios.js";

const unwrap = (res) => res.data?.data ?? res.data;

/* ── Checkout Summary ────────────────────────────────────────── */
export const fetchCheckoutSummary = (deliveryType = "standard") =>
  api.get("/orders/checkout-summary", { params: { deliveryType } }).then(unwrap);

/* ── Orders ──────────────────────────────────────────────────── */
export const createOrder = (body) =>
  api.post("/orders/create", body).then(unwrap);

export const fetchOrder = (orderId) =>
  api.get(`/orders/${orderId}`).then(unwrap);

export const fetchBuyerOrders = () =>
  api.get("/orders/buyer").then(unwrap);

/* ── Addresses ───────────────────────────────────────────────── */
export const fetchAddresses = () =>
  api.get("/addresses").then(unwrap);

export const createAddress = (body) =>
  api.post("/addresses", body).then(unwrap);

export const updateAddress = (id, body) =>
  api.put(`/addresses/${id}`, body).then(unwrap);

export const deleteAddress = (id) =>
  api.delete(`/addresses/${id}`).then(unwrap);
