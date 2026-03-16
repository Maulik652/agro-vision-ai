import api from "./axios";

const unwrap = (response) => response?.data?.data;

export const fetchDashboardOverview = async () => {
  const response = await api.get("/dashboard/overview");
  return unwrap(response) || {
    totalOrders: 0,
    totalSpending: 0,
    walletBalance: 0,
    activeOrders: 0,
    currency: "INR"
  };
};

export const fetchDashboardPriceTrends = async ({ crop, days }) => {
  const response = await api.get("/dashboard/price-trends", {
    params: {
      crop: crop || undefined,
      days: days || undefined
    }
  });

  return unwrap(response) || {
    crop: "Wheat",
    days: 30,
    availableCrops: [],
    points: [],
    summary: {
      currentPrice: 0,
      averagePrice: 0,
      changePercent: 0
    }
  };
};

export const fetchDashboardRecommendations = async ({ limit = 6, cropFilter = [] } = {}) => {
  const response = await api.get("/dashboard/recommendations", {
    params: {
      limit,
      cropFilter: Array.isArray(cropFilter) && cropFilter.length ? cropFilter.join(",") : undefined
    }
  });

  return Array.isArray(unwrap(response)) ? unwrap(response) : [];
};

export const fetchDashboardRecentOrders = async ({ limit = 8 } = {}) => {
  const response = await api.get("/dashboard/recent-orders", {
    params: { limit }
  });

  return Array.isArray(unwrap(response)) ? unwrap(response) : [];
};

export const fetchDashboardSpending = async () => {
  const response = await api.get("/dashboard/spending");

  return unwrap(response) || {
    monthlySpending: [],
    weeklyPurchases: []
  };
};

export const fetchDashboardTopFarmers = async ({ limit = 6 } = {}) => {
  const response = await api.get("/dashboard/top-farmers", {
    params: { limit }
  });

  return Array.isArray(unwrap(response)) ? unwrap(response) : [];
};

export const fetchDashboardAIInsights = async () => {
  const response = await api.get("/dashboard/ai-insights");

  return unwrap(response) || {
    crop: "Wheat",
    predictedCropPrice: 0,
    demandForecast: { score: 0, level: "medium" },
    marketVolatility: { score: 0, level: "medium" },
    modelsUsed: {
      priceModel: "xgboost",
      demandModel: "random_forest"
    },
    generatedAt: new Date().toISOString()
  };
};

export const fetchDashboardFavoriteCrops = async ({ limit = 6 } = {}) => {
  const response = await api.get("/dashboard/favorite-crops", {
    params: { limit }
  });

  return Array.isArray(unwrap(response)) ? unwrap(response) : [];
};

export const fetchDashboardNotifications = async ({ limit = 12 } = {}) => {
  const response = await api.get("/notifications", {
    params: {
      limit,
      page: 1
    }
  });

  return Array.isArray(response?.data?.notifications) ? response.data.notifications : [];
};