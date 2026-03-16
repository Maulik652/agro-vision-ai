import * as dashboardService from "../services/buyerDashboardService.js";

export const getBuyerDashboardSummary = async (req, res) => {
  try {
    const data = await dashboardService.fetchSummary(req.user.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getBuyerRecommendations = async (req, res) => {
  try {
    const data = await dashboardService.fetchRecommendations(req.user.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMarketplaceDeals = async (req, res) => {
  try {
    const data = await dashboardService.fetchMarketplaceDeals();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getRecentOrders = async (req, res) => {
  try {
    const data = await dashboardService.fetchRecentOrders(req.user.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getWalletSnapshot = async (req, res) => {
  try {
    const data = await dashboardService.fetchWallet(req.user.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getNotifications = async (req, res) => {
  try {
    const data = await dashboardService.fetchNotifications(req.user.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};