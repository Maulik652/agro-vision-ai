import api from "../api/axios.js";

export const fetchBuyerAnalytics = (params = {}) =>
  api.get("/analytics/buyer", { params }).then((r) => r.data);

export const fetchAIInsights = () =>
  api.get("/analytics/ai-insights").then((r) => r.data);

export const fetchAIPredictions = () =>
  api.get("/analytics/ai-predictions").then((r) => r.data);
