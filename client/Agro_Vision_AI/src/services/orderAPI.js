/**
 * Order API Service — AgroVision AI
 * Thin wrappers around the axios instance for order endpoints.
 */
import api from "../api/axios.js";

const unwrap = (res) => res.data?.data ?? res.data;

/** GET /api/orders/buyer — fetch all orders for the logged-in buyer */
export const fetchBuyerOrders = () =>
  api.get("/orders/buyer").then(unwrap);

/** GET /api/orders/:orderId — fetch a single order by orderId string */
export const fetchOrderById = (orderId) =>
  api.get(`/orders/${orderId}`).then(unwrap);
