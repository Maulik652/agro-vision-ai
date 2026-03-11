import api from "./axios";

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
