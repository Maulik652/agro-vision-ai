import api from "./axios";

export const getBuyerDashboardInsights = async () => {
  const response = await api.get("/buyers/dashboard/insights");
  return response.data;
};

export const getBuyerPriceTrends = async (crop = "Wheat", days = 30) => {
  const response = await api.get("/buyers/dashboard/price-trends", {
    params: { crop, days }
  });
  return response.data;
};

export const getBuyerRecommendations = async () => {
  const response = await api.get("/buyers/dashboard/recommendations");
  return response.data;
};

export const getBuyerWallet = async () => {
  const response = await api.get("/buyers/dashboard/wallet");
  return response.data;
};

export const getBuyerOrders = async (status = "", limit = 10) => {
  const response = await api.get("/buyers/dashboard/orders", {
    params: { status, limit }
  });
  return response.data;
};

export const getBuyerAnalytics = async () => {
  const response = await api.get("/buyers/dashboard/analytics");
  return response.data;
};