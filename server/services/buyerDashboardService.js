import Order from "../models/Order.js";
import Wallet from "../models/Wallet.js";
import Notification from "../models/Notification.js";
import MarketplaceCrop from "../models/MarketplaceCrop.js";
import MarketTrend from "../models/MarketTrend.js";

export const fetchSummary = async (userId) => {

  const activeOrders = await Order.countDocuments({
    buyer: userId,
    status: { $in: ["pending", "processing", "shipped"] }
  });

  const deliveredOrders = await Order.countDocuments({
    buyer: userId,
    status: "delivered"
  });

  const wallet = await Wallet.findOne({ user: userId });

  return {
    walletBalance: wallet?.balance || 0,
    activeOrders,
    deliveredOrders
  };
};

export const fetchMarketplaceDeals = async () => {

  const deals = await MarketplaceCrop
    .find({ status: "available" })
    .limit(6)
    .populate("farmer", "name");

  return deals;
};

export const fetchRecentOrders = async (userId) => {

  const orders = await Order
    .find({ buyer: userId })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("items.crop");

  return orders;
};

export const fetchWallet = async (userId) => {

  const wallet = await Wallet.findOne({ user: userId });

  return wallet;
};

export const fetchNotifications = async (userId) => {

  const notifications = await Notification
    .find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(5);

  return notifications;
};

export const fetchRecommendations = async () => {

  const trending = await MarketTrend
    .find({})
    .sort({ demandScore: -1 })
    .limit(5);

  return trending;
};