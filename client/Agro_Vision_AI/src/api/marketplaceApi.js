import api from "./axios";

/*
 * Marketplace module APIs
 * - Dedicated REST surface under /api/marketplace for buyer marketplace UI
 * - Uses server-side filtering, pagination and AI aggregation
 */

export const fetchMarketplaceCrops = async (params = {}) => {
  const response = await api.get("/marketplace/crops", { params });
  return response.data;
};

export const fetchMarketplaceCropById = async (cropId) => {
  const response = await api.get(`/marketplace/crops/${cropId}`);
  return response.data;
};

export const fetchMarketplaceCategories = async () => {
  const response = await api.get("/marketplace/categories");
  return response.data;
};

export const fetchMarketplaceFarmerById = async (farmerId) => {
  const response = await api.get(`/marketplace/farmers/${farmerId}`);
  return response.data;
};

export const fetchMarketplaceAIInsights = async (crop) => {
  const response = await api.get("/marketplace/ai-insights", { params: { crop } });
  return response.data;
};

export const addMarketplaceItemToCart = async (payload) => {
  const response = await api.post("/cart/add", payload);
  return response.data;
};

export const getMarketplaceListings = async (params = {}) => {
  const response = await api.get("/crops", { params });
  return response.data;
};

export const getCropDetail = async (id) => {
  const response = await api.get(`/crops/${id}`);
  return response.data;
};

export const createCropListing = async (payload) => {
  const response = await api.post("/crops", payload);
  return response.data;
};

export const getMarketTrends = async (params = {}) => {
  const response = await api.get("/crops/trends", { params });
  return response.data;
};

export const getHighDemandCrops = async () => {
  const response = await api.get("/crops/high-demand");
  return response.data;
};

export const getNearbyBuyers = async (params = {}) => {
  const response = await api.get("/buyers", { params });
  return response.data;
};

export const getSmartBuyerAlerts = async (params = {}) => {
  const response = await api.get("/buyers/alerts", { params });
  return response.data;
};

export const getAIPriceSuggestion = async (payload) => {
  const response = await api.post("/ai/price", payload);
  return response.data;
};

export const getAIDemandPrediction = async (payload) => {
  const response = await api.post("/ai/demand", payload);
  return response.data;
};

export const getAISellAssistant = async (payload) => {
  const response = await api.post("/ai/sell-assistant", payload);
  return response.data;
};

export const getAIQualityCheck = async (payload) => {
  const response = await api.post("/ai/quality", payload);
  return response.data;
};

export const getAILogisticsEstimate = async (payload) => {
  const response = await api.post("/ai/logistics", payload);
  return response.data;
};

export const getFarmerEarningsDashboard = async () => {
  const response = await api.get("/crops/earnings/dashboard");
  return response.data;
};

export const getFarmerMarketIntelligence = async (params = {}) => {
  const response = await api.get("/crops/farmer/intelligence", { params });
  return response.data;
};

/* ─── Market Intelligence APIs ────────────────────────────────────── */

export const getMarketIntelPrices = async (crop) => {
  const response = await api.get("/market/intel/prices", { params: { crop } });
  return response.data;
};

export const getMarketIntelTrends = async (crop, days = 30) => {
  const response = await api.get("/market/intel/trends", { params: { crop, days } });
  return response.data;
};

export const getMarketIntelPredict = async (crop) => {
  const response = await api.get("/market/intel/predict", { params: { crop } });
  return response.data;
};

export const getMarketIntelInsights = async (crop) => {
  const response = await api.get("/market/intel/insights", { params: { crop } });
  return response.data;
};

export const getMarketIntelProfitability = async (crop) => {
  const response = await api.get("/market/intel/profitability", { params: { crop } });
  return response.data;
};

export const getMarketIntelNearby = async (crop, market) => {
  const response = await api.get("/market/intel/nearby", { params: { crop, market } });
  return response.data;
};

export const getMarketIntelHeatmap = async (crop) => {
  const response = await api.get("/market/intel/heatmap", { params: { crop } });
  return response.data;
};

/* ─── Sell Crop: Farmer Listing Management ────────────────────────── */

export const getMyListings = async () => {
  const response = await api.get("/crops/my-listings");
  return response.data;
};

export const updateCropListing = async (id, payload) => {
  const response = await api.put(`/crops/${id}`, payload);
  return response.data;
};

export const deleteCropListing = async (id) => {
  const response = await api.delete(`/crops/${id}`);
  return response.data;
};

export const pauseCropListing = async (id) => {
  const response = await api.patch(`/crops/${id}/pause`);
  return response.data;
};

/* ─── Sell Crop: Offers ───────────────────────────────────────────── */

export const getFarmerOffers = async () => {
  const response = await api.get("/crops/offers");
  return response.data;
};

export const getListingOffers = async (id) => {
  const response = await api.get(`/crops/${id}/offers`);
  return response.data;
};

export const submitBuyerOffer = async (payload) => {
  const response = await api.post("/crops/offers", payload);
  return response.data;
};

export const respondToOffer = async (offerId, payload) => {
  const response = await api.patch(`/crops/offers/${offerId}/respond`, payload);
  return response.data;
};

/* ─── Sell Crop: Orders ───────────────────────────────────────────── */

export const getFarmerOrders = async () => {
  const response = await api.get("/crops/orders");
  return response.data;
};

export const createOrderFromOffer = async (offerId) => {
  const response = await api.post("/crops/orders", { offerId });
  return response.data;
};

export const updateOrderStatus = async (orderId, status) => {
  const response = await api.patch(`/crops/orders/${orderId}`, { status });
  return response.data;
};

/* ─── Sell Crop: Analytics & Discovery ────────────────────────────── */

export const getSalesAnalytics = async () => {
  const response = await api.get("/crops/sales/analytics");
  return response.data;
};

export const discoverBuyers = async (crop, location) => {
  const response = await api.get("/crops/discover-buyers", { params: { crop, location } });
  return response.data;
};

export const getHarvestInsights = async (crop) => {
  const response = await api.get("/crops/harvest-insights", { params: { crop } });
  return response.data;
};

export const getDemandIndicators = async () => {
  const response = await api.get("/crops/demand-indicators");
  return response.data;
};
