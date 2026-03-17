import api from "./axios.js";
const unwrap = (r) => r?.data?.data;

export const fetchOverview      = (p = {}) => api.get("/expert/earnings/overview",       { params: p }).then(unwrap);
export const fetchTrends        = (p = {}) => api.get("/expert/earnings/trends",          { params: p }).then(unwrap);
export const fetchTransactions  = (p = {}) => api.get("/expert/earnings/transactions",    { params: p }).then(unwrap);
export const fetchCommission    = (p = {}) => api.get("/expert/earnings/commission",      { params: p }).then(unwrap);
export const fetchPayouts       = (p = {}) => api.get("/expert/earnings/payouts",         { params: p }).then(unwrap);
export const fetchPaymentStatus = (p = {}) => api.get("/expert/earnings/payment-status",  { params: p }).then(unwrap);
export const fetchForecast      = ()       => api.get("/expert/earnings/forecast").then(unwrap);
export const releasePayout      = (orderId) => api.patch(`/expert/earnings/payouts/${orderId}/release`).then(unwrap);
export const exportEarnings     = (body)   => api.post("/expert/earnings/export", body).then(unwrap);
