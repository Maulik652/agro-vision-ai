import api from "./axios";

const unwrap = (res) => res.data?.data ?? res.data;
const BASE = "/farmer/marketplace";

export const getMarketSummary     = ()       => api.get(`${BASE}/summary`).then(unwrap);
export const getFarmerProfile     = ()       => api.get(`${BASE}/profile`).then(unwrap);
export const getEarnings          = ()       => api.get(`${BASE}/earnings`).then(unwrap);
export const getMarketInsights    = (crop)   => api.get(`${BASE}/market-insights`, { params: { crop } }).then(unwrap);
export const getBuyerRequests     = ()       => api.get(`${BASE}/buyer-requests`).then(unwrap);
export const getRecentOrders      = (p = {}) => api.get(`${BASE}/orders`, { params: p }).then(unwrap);
export const updateCropOrder      = (id, body) => api.patch(`${BASE}/orders/${id}`, body).then(unwrap);
export const getMarketReviews     = ()       => api.get(`${BASE}/reviews`).then(unwrap);
export const getAIPriceSuggestion = (body)   => api.post(`${BASE}/ai-price`, body).then(unwrap);
export const getInventory         = ()       => api.get(`${BASE}/inventory`).then(unwrap);
export const getCropAnalytics     = ()       => api.get(`${BASE}/crop-analytics`).then(unwrap);
export const askAIAssistant       = (body)   => api.post(`${BASE}/ai-assistant`, body).then(unwrap);
export const getNotifications     = ()       => api.get(`${BASE}/notifications`).then(unwrap);
export const markAllRead          = ()       => api.patch(`${BASE}/notifications/read-all`).then(unwrap);

export {
  getMyListings,
  deleteCropListing,
  pauseCropListing,
  getFarmerOffers,
  respondToOffer,
  getFarmerOrders,
  updateOrderStatus,
  getSalesAnalytics,
} from "./marketplaceApi";
