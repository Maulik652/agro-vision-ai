import api from "./axios";

export const getDashboardSummary = () =>
  api.get("/buyer/dashboard/summary");

export const getDeals = () =>
  api.get("/buyer/dashboard/marketplace-deals");

export const getOrders = () =>
  api.get("/buyer/dashboard/orders");

export const getWallet = () =>
  api.get("/buyer/dashboard/wallet");

export const getNotifications = () =>
  api.get("/buyer/dashboard/notifications");

export const getRecommendations = () =>
  api.get("/buyer/dashboard/recommendations");