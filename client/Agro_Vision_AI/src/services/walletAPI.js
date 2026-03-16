/**
 * Wallet API Service — AgroVision AI
 */
import api from "../api/axios.js";

const unwrap = (res) => res.data?.data ?? res.data;

export const fetchWallet       = ()           => api.get("/wallet").then(unwrap);
export const fetchTransactions = (params)     => api.get("/wallet/transactions", { params }).then(unwrap);
export const addMoney          = (body)       => api.post("/wallet/add-money", body).then(unwrap);
export const verifyTopup       = (body)       => api.post("/wallet/verify-topup", body).then(unwrap);
export const walletPay         = (body)       => api.post("/wallet/pay", body).then(unwrap);
