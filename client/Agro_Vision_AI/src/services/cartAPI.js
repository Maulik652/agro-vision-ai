/**
 * Cart API Service
 * Thin wrappers around the axios instance.
 * All cart endpoints live here — import from this file, not marketplaceApi.
 */
import api from "../api/axios.js";

const unwrap = (res) => res.data?.data ?? res.data;

/** GET /api/cart */
export const fetchCart = () =>
  api.get("/cart").then(unwrap);

/** POST /api/cart/add */
export const addItemToCart = (cropId, quantity) =>
  api.post("/cart/add", { cropId, quantity }).then(unwrap);

/** PUT /api/cart/update/:cropId */
export const updateCartItem = (cropId, quantity) =>
  api.put(`/cart/update/${cropId}`, { quantity }).then(unwrap);

/** DELETE /api/cart/remove/:cropId */
export const removeCartItem = (cropId) =>
  api.delete(`/cart/remove/${cropId}`).then(unwrap);

/** DELETE /api/cart/clear */
export const clearCartAPI = () =>
  api.delete("/cart/clear").then((res) => res.data);

/** GET /api/cart/delivery-estimate?buyerState=... */
export const fetchDeliveryEstimate = (buyerState = "") =>
  api.get("/cart/delivery-estimate", { params: { buyerState } }).then(unwrap);

/** GET /api/crops?category=...&limit=8 — for recommended crops */
export const fetchRecommendedCrops = (category = "", limit = 8) =>
  api.get("/crops", { params: { category, limit, status: "active" } })
    .then((res) => res.data?.data?.crops ?? res.data?.crops ?? []);
