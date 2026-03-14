import axios from "axios";
import mongoose from "mongoose";
import MarketTrend from "../models/MarketTrend.js";
import CropPriceHistory from "../models/CropPriceHistory.js";
import CropListing from "../models/CropListing.js";
import Order from "../models/Order.js";
import Wallet from "../models/Wallet.js";
import Payment from "../models/Payment.js";
import Notification from "../models/Notification.js";
import { getOrSetCache } from "../config/redis.js";
import { emitToRoom } from "../realtime/socketServer.js";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

const parseNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const buildCropMetric = (doc) => ({
  cropName: doc.cropName,
  demandScore: doc.demandScore,
  pricePerKg: doc.pricePerKg,
  volume: doc.volume,
  location: doc.location
});

const buildMarketTrendSummary = async () => {
  const last30 = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const aggregation = await MarketTrend.aggregate([
    { $match: { date: { $gte: last30 } } },
    {
      $group: {
        _id: { day: { $dateToString: { format: "%Y-%m-%d", date: "$date" } } },
        avgDemand: { $avg: "$demandScore" },
        avgPrice: { $avg: "$pricePerKg" }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const labels = aggregation.map((item) => item._id.day);
  const demand = aggregation.map((item) => Number(item.avgDemand.toFixed(1)));
  const price = aggregation.map((item) => Number(item.avgPrice.toFixed(2)));

  return {
    labels,
    demand,
    price,
    currentDemand: demand.at(-1) ?? 50,
    demandChange: demand.length > 1 ? Number((demand.at(-1) - demand[0]).toFixed(1)) : 0,
    currentPrice: price.at(-1) ?? 0,
    priceChange: price.length > 1 ? Number((price.at(-1) - price[0]).toFixed(2)) : 0
  };
};

const getVolatilityForCrop = async (cropName, days = 30) => {
  const fromDate = new Date(Date.now() - days * 24 * 3600 * 1000);
  const rows = await CropPriceHistory.find({ cropName, date: { $gte: fromDate } }).sort({ date: 1 }).lean();

  if (!rows.length) {
    return 15.0;
  }

  const prices = rows.map((row) => row.price);
  const mean = prices.reduce((sum, value) => sum + Number(value), 0) / prices.length;
  const variance = prices.reduce((sum, value) => sum + Math.pow(Number(value) - mean, 2), 0) / prices.length;
  const stddev = Math.sqrt(variance);

  return Number(((stddev / Math.max(1, mean)) * 100).toFixed(2));
};

const safeAiCall = async (endpoint, payload, defaultValue = null) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}${endpoint}`, payload, {
      timeout: 9000
    });

    return response.data;
  } catch (error) {
    console.warn("AI service error", endpoint, error.message);
    return defaultValue;
  }
};

export const getBuyerDashboardInsights = async (req, res) => {
  try {
    const buyerId = String(req.user._id);
    const cacheKey = `buyer:${buyerId}:dashboard:insights`;

    const dashboard = await getOrSetCache(cacheKey, 300, async () => {
      const topDemandedCrops = await MarketTrend.find({})
        .sort({ demandScore: -1, volume: -1 })
        .limit(5)
        .lean();

      const activeCrop = topDemandedCrops[0]?.cropName || "Wheat";
      const marketTrend = await buildMarketTrendSummary();

      const topCropHistory = await CropPriceHistory.find({ cropName: activeCrop })
        .sort({ date: -1 })
        .limit(30)
        .lean();

      const history = topCropHistory.reverse().map((r) => Number(r.price));
      const aiPrice = await safeAiCall("/ai/price-prediction", {
        crop: activeCrop,
        location: "market",
        days: 30,
        price_history: history,
        demand_score: marketTrend.currentDemand
      }, {
        predicted_price: topCropHistory.at(-1)?.price || 0,
        demand_score: marketTrend.currentDemand,
        volatility_score: await getVolatilityForCrop(activeCrop, 30),
        model: "fallback"
      });

      const marketVolatility = await getVolatilityForCrop(activeCrop, 30);

      return {
        topDemandedCrops: topDemandedCrops.map(buildCropMetric),
        marketTrend,
        aiPredictedPrice: {
          crop: activeCrop,
          predictedPrice: Number(aiPrice?.predicted_price ?? 0),
          demandScore: Number(aiPrice?.demand_score ?? 0),
          volatilityScore: Number(aiPrice?.volatility_score ?? marketVolatility),
          model: aiPrice?.model ?? "fallback"
        },
        marketVolatilityIndicator: marketVolatility
      };
    });

    return res.status(200).json(dashboard);
  } catch (error) {
    console.error("getBuyerDashboardInsights", error);
    return res.status(500).json({ message: "Unable to fetch buyer dashboard insights" });
  }
};

export const getBuyerPriceTrends = async (req, res) => {
  try {
    const { crop = "Wheat", days = 30 } = req.validatedQuery || req.query;

    const duration = Math.min(90, Math.max(30, parseNumber(days, 30)));
    const fromDate = new Date(Date.now() - duration * 24 * 3600 * 1000);

    const history = await getOrSetCache(`buyer:price-trends:${crop.toLowerCase()}:${duration}`, 300, async () => {
      const rows = await CropPriceHistory.find({ cropName: { $regex: new RegExp(`^${crop}$`, "i") }, date: { $gte: fromDate } })
        .sort({ date: 1 })
        .lean();

      if (!rows.length) {
        const now = Date.now();
        return Array.from({ length: duration }, (_, index) => ({
          date: new Date(now - (duration - index - 1) * 24 * 3600 * 1000),
          price: Number(20 + 4.5 * Math.sin(index * 0.22) + Math.cos(index * 0.14)).toFixed(2)
        }));
      }

      return rows.map((row) => ({
        date: row.date,
        price: row.price
      }));
    });

    const priceValues = history.map((item) => Number(item.price));
    const flux = priceValues.length > 1 ? Number(((priceValues[priceValues.length - 1] - priceValues[0]) / Math.max(1, priceValues[0])) * 100).toFixed(1) : 0;

    const forecastAI = await safeAiCall("/ai/demand-forecast", {
      crop,
      location: "market",
      days: duration,
      price_history: priceValues
    }, null);

    return res.status(200).json({ crop, duration, data: history, trendFlux: Number(flux), ai: forecastAI });
  } catch (error) {
    console.error("getBuyerPriceTrends", error);
    return res.status(500).json({ message: "Unable to fetch price trends" });
  }
};

export const getBuyerRecommendations = async (req, res) => {
  try {
    const sampleTrend = await MarketTrend.find({}).sort({ demandScore: -1 }).limit(10).lean();

    const candidates = sampleTrend.map((entry) => ({
      crop: entry.cropName,
      avg_price: entry.pricePerKg,
      availability: entry.volume,
      listing_count: Math.max(1, Math.round(entry.volume / 15))
    }));

    const aiResult = await safeAiCall("/ai/recommend-crops", {
      location: "market",
      crops: candidates
    }, { recommendations: [] });

    return res.status(200).json({ recommendations: aiResult.recommendations || [] });
  } catch (error) {
    console.error("getBuyerRecommendations", error);
    return res.status(500).json({ message: "Unable to fetch recommendations" });
  }
};

export const getBuyerWallet = async (req, res) => {
  try {
    const buyerId = req.user._id;
    let wallet = await Wallet.findOne({ user: buyerId }).lean();

    if (!wallet) {
      const orders = await Order.find({ buyer: buyerId }).lean();
      const payments = await Payment.find({ user: buyerId }).lean();

      const totalDebit = payments.filter((p) => p.type === "outbound" && p.status === "completed").reduce((sum, item) => sum + item.amount, 0);
      const totalCredit = payments.filter((p) => p.type === "inbound" && p.status === "completed").reduce((sum, item) => sum + item.amount, 0);
      const totalPending = payments.filter((p) => p.status === "pending").reduce((sum, item) => sum + item.amount, 0);

      wallet = {
        balance: Number(Math.max(0, totalCredit - totalDebit).toFixed(2)),
        pendingPayments: Number(totalPending.toFixed(2)),
        escrowBalance: Number((orders.filter((o) => ["processing", "shipped"].includes(o.status)).reduce((sum, item) => sum + item.totalAmount * 0.1, 0)).toFixed(2)),
        lastTransaction: payments?.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate))[0] || {
          amount: 0,
          type: "credit",
          remark: "No transaction data",
          date: new Date()
        }
      };
    }

    return res.status(200).json(wallet);
  } catch (error) {
    console.error("getBuyerWallet", error);
    return res.status(500).json({ message: "Unable to fetch wallet overview" });
  }
};

export const getBuyerOrders = async (req, res) => {
  try {
    const buyerId = req.user._id;
    const { status, limit = 20 } = req.validatedQuery || req.query;

    const query = { buyer: buyerId };
    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate("farmer", "name")
      .populate("cropListing", "cropName")
      .sort({ createdAt: -1 })
      .limit(Math.min(100, Number(limit) || 20))
      .lean();

    const transformed = orders.map((order) => ({
      orderId: order.orderId,
      crop: order.cropName || order.cropListing?.cropName,
      farmer: order.farmer?.name || "Unknown Farmer",
      quantity: `${order.quantity} ${order.quantityUnit}`,
      price: Number(order.totalAmount.toFixed(2)),
      status: order.status,
      deliveryETA: order.deliveryDate ? new Date(order.deliveryDate).toISOString() : "TBD",
      createdAt: order.createdAt
    }));

    emitToRoom("buyers", "order_update", { buyerId: String(buyerId), count: transformed.length });

    return res.status(200).json({ orders: transformed });
  } catch (error) {
    console.error("getBuyerOrders", error);
    return res.status(500).json({ message: "Unable to fetch orders" });
  }
};

export const getBuyerAnalytics = async (req, res) => {
  try {
    const buyerId = req.user._id;

    const monthlyData = await Order.aggregate([
      { $match: { buyer: new mongoose.Types.ObjectId(buyerId), status: { $in: ["processing", "shipped", "delivered"] } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          total: { $sum: "$totalAmount" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const categoryData = await Order.aggregate([
      { $match: { buyer: new mongoose.Types.ObjectId(buyerId), status: { $in: ["processing", "shipped", "delivered"] } } },
      {
        $group: {
          _id: "$cropName",
          total: { $sum: "$totalAmount" }
        }
      },
      { $sort: { total: -1 } },
      { $limit: 8 }
    ]);

    const formattedMonthly = monthlyData.map((item) => ({
      month: `${item._id.month}-${item._id.year}`,
      spend: Number(item.total.toFixed(2))
    }));

    const formattedCategory = categoryData.map((item) => ({
      name: item._id,
      value: Number(item.total.toFixed(2))
    }));

    return res.status(200).json({ monthlySpending: formattedMonthly, categoryBreakdown: formattedCategory });
  } catch (error) {
    console.error("getBuyerAnalytics", error);
    return res.status(500).json({ message: "Unable to fetch analytics" });
  }
};

export const pushBuyerNotification = async (payload) => {
  try {
    const note = new Notification(payload);
    await note.save();

    emitToRoom("buyers", "new_notification", {
      type: payload.type,
      title: payload.title,
      message: payload.message,
      data: payload.data || {}
    });
  } catch (error) {
    console.error("pushBuyerNotification", error);
  }
};
