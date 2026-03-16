import api from "./axios";
import { addItemToCart } from "../services/cartAPI.js";

const unwrap = (res) => res.data?.data ?? res.data;

/* ══════════════════════════════════════════════
   FARMER CROP LISTING MANAGEMENT
   Base: /api/crops
══════════════════════════════════════════════ */

/** GET /api/crops/my-listings */
export const getMyListings = (params = {}) =>
  api.get("/crops/my-listings", { params }).then(unwrap);

/** DELETE /api/crops/:id */
export const deleteCropListing = (id) =>
  api.delete(`/crops/${id}`).then(unwrap);

/** PATCH /api/crops/:id/pause */
export const pauseCropListing = (id) =>
  api.patch(`/crops/${id}/pause`).then(unwrap);

/* ══════════════════════════════════════════════
   OFFERS
   Base: /api/crops
══════════════════════════════════════════════ */

/** GET /api/crops/offers — farmer's received offers */
export const getFarmerOffers = (params = {}) =>
  api.get("/crops/offers", { params }).then(unwrap);

/** PATCH /api/crops/offers/:id/respond — accept or reject an offer */
export const respondToOffer = (offerId, body) =>
  api.patch(`/crops/offers/${offerId}/respond`, body).then(unwrap);

/* ══════════════════════════════════════════════
   ORDERS
   Base: /api/crops
══════════════════════════════════════════════ */

/** GET /api/crops/orders */
export const getFarmerOrders = (params = {}) =>
  api.get("/crops/orders", { params }).then(unwrap);

/** POST /api/crops/orders — create an order from an accepted offer */
export const createOrderFromOffer = (body) =>
  api.post("/crops/orders", body).then(unwrap);

/** PATCH /api/crops/orders/:id — update order status */
export const updateOrderStatus = (orderId, body) =>
  api.patch(`/crops/orders/${orderId}`, body).then(unwrap);

/* ══════════════════════════════════════════════
   ANALYTICS & INTELLIGENCE
   Base: /api/crops
══════════════════════════════════════════════ */

/** GET /api/crops/sales/analytics */
export const getSalesAnalytics = (params = {}) =>
  api.get("/crops/sales/analytics", { params }).then(unwrap);

/** GET /api/crops/discover-buyers */
export const discoverBuyers = (params = {}) =>
  api.get("/crops/discover-buyers", { params }).then(unwrap);

/** GET /api/crops/harvest-insights */
export const getHarvestInsights = (params = {}) =>
  api.get("/crops/harvest-insights", { params }).then(unwrap);

/** GET /api/crops/demand-indicators */
export const getDemandIndicators = (params = {}) =>
  api.get("/crops/demand-indicators", { params }).then(unwrap);

/* ══════════════════════════════════════════════
   AI SUGGESTIONS
   Base: /api/ai
══════════════════════════════════════════════ */

/** POST /api/ai/price — AI crop price suggestion */
export const getAIPriceSuggestion = (body) =>
  api.post("/ai/price", body).then(unwrap);

/** POST /api/ai/demand — AI demand prediction */
export const getAIDemandPrediction = (body) =>
  api.post("/ai/demand", body).then(unwrap);

/** POST /api/ai/quality — AI crop quality check */
export const getAIQualityCheck = (body) =>
  api.post("/ai/quality", body).then(unwrap);

/** POST /api/ai/sell-assistant — AI selling assistant */
export const getAISellAssistant = (body) =>
  api.post("/ai/sell-assistant", body).then(unwrap);

/* ══════════════════════════════════════════════
   CROP LISTING CREATION
   Base: /api/crops
══════════════════════════════════════════════ */

/** POST /api/crops — create a new crop listing */
export const createCropListing = (body) =>
  api.post("/crops", body).then(unwrap);

/* ══════════════════════════════════════════════
   BUYER MARKETPLACE
   Base: /api/crops
══════════════════════════════════════════════ */

/** GET /api/crops — search & filter crop listings */
export const searchCrops = (params = {}) =>
  api.get("/crops", { params }).then((res) => res.data);

/** GET /api/crops/high-demand — trending crops */
export const getHighDemandCrops = (params = {}) =>
  api.get("/crops/high-demand", { params }).then((res) => res.data?.data ?? res.data);

/** POST /api/crops/offers — buyer submits an offer */
export const submitOffer = (body) =>
  api.post("/crops/offers", body).then((res) => res.data?.data ?? res.data);

/** POST /api/ai/price-negotiation — AI negotiation suggestion */
export const getAINegotiationSuggestion = (body) =>
  api.post("/ai/price-negotiation", body).then((res) => res.data?.data ?? res.data);

/* ══════════════════════════════════════════════
   CART — re-exported from services/cartAPI.js
   Use services/cartAPI.js directly in new code.
══════════════════════════════════════════════ */
export { fetchCart as getCart, removeCartItem as removeFromCart, clearCartAPI as clearCart } from "../services/cartAPI.js";

/**
 * addToCart — legacy object-arg wrapper used by Marketplace & CropDetail.
 * Accepts { cropId, quantity } to match existing call sites.
 */
export const addToCart = ({ cropId, quantity = 1 } = {}) =>
  addItemToCart(cropId, quantity);

/* ══════════════════════════════════════════════
   MARKET INTELLIGENCE
   Base: /api/market/intel
══════════════════════════════════════════════ */

/** GET /api/market/intel/prices */
export const getMarketIntelPrices = (params = {}) =>
  api.get("/market/intel/prices", { params }).then(unwrap);

/** GET /api/market/intel/trends */
export const getMarketIntelTrends = (params = {}) =>
  api.get("/market/intel/trends", { params }).then(unwrap);

/** GET /api/market/intel/predict */
export const getMarketIntelPredict = (params = {}) =>
  api.get("/market/intel/predict", { params }).then(unwrap);

/** GET /api/market/intel/insights */
export const getMarketIntelInsights = (params = {}) =>
  api.get("/market/intel/insights", { params }).then(unwrap);

/** GET /api/market/intel/profitability */
export const getMarketIntelProfitability = (params = {}) =>
  api.get("/market/intel/profitability", { params }).then(unwrap);

/** GET /api/market/intel/nearby */
export const getMarketIntelNearby = (params = {}) =>
  api.get("/market/intel/nearby", { params }).then(unwrap);

/** GET /api/market/intel/heatmap */
export const getMarketIntelHeatmap = (params = {}) =>
  api.get("/market/intel/heatmap", { params }).then(unwrap);
