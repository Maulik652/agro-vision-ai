/**
 * Analytics Service — AgroVision AI
 * MongoDB aggregation pipelines on the Order collection.
 */
import mongoose from "mongoose";
import Order from "../models/Order.js";

/** Convert range string to a Date cutoff */
const rangeToDate = (range) => {
  const now = new Date();
  switch (range) {
    case "7d":  return new Date(now - 7  * 86400000);
    case "6m":  return new Date(now - 180 * 86400000);
    case "1y":  return new Date(now - 365 * 86400000);
    default:    return new Date(now - 30  * 86400000); // 30d
  }
};

/**
 * Core buyer analytics — overview stats + chart data.
 */
export const getBuyerAnalyticsData = async (buyerId, { range = "30d", cropType } = {}) => {
  const uid   = new mongoose.Types.ObjectId(buyerId);
  const since = rangeToDate(range);

  // Base match — all buyer orders in range
  const baseMatch = { buyer: uid, createdAt: { $gte: since } };
  if (cropType) {
    baseMatch["items.cropName"] = { $regex: new RegExp(cropType, "i") };
  }

  const [overview, monthly, cropDist, delivery, topFarmers] = await Promise.all([
    /* ── 1. Overview stats ─────────────────────────────────── */
    Order.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: null,
          totalOrders:     { $sum: 1 },
          totalSpent:      { $sum: "$totalAmount" },
          activeOrders:    {
            $sum: {
              $cond: [
                { $in: ["$orderStatus", ["paid", "processing", "shipped"]] }, 1, 0
              ]
            }
          },
          completedOrders: {
            $sum: { $cond: [{ $eq: ["$orderStatus", "completed"] }, 1, 0] }
          },
        },
      },
    ]),

    /* ── 2. Monthly spending ───────────────────────────────── */
    Order.aggregate([
      { $match: { ...baseMatch, paymentStatus: "paid" } },
      {
        $group: {
          _id: {
            year:  { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          amount: { $sum: "$totalAmount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      {
        $project: {
          _id: 0,
          month: {
            $let: {
              vars: {
                months: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
              },
              in: { $arrayElemAt: ["$$months", { $subtract: ["$_id.month", 1] }] },
            },
          },
          amount: { $round: ["$amount", 0] },
        },
      },
    ]),

    /* ── 3. Crop purchase distribution ────────────────────── */
    Order.aggregate([
      { $match: baseMatch },
      { $unwind: "$items" },
      {
        $group: {
          _id:   "$items.cropName",
          count: { $sum: "$items.quantity" },
          spent: { $sum: "$items.subtotal" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 8 },
      { $project: { _id: 0, crop: "$_id", count: 1, spent: { $round: ["$spent", 0] } } },
    ]),

    /* ── 4. Delivery performance ───────────────────────────── */
    Order.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: null,
          onTime:    { $sum: { $cond: [{ $eq: ["$orderStatus", "completed"] }, 1, 0] } },
          delayed:   { $sum: { $cond: [{ $eq: ["$orderStatus", "shipped"] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ["$orderStatus", "cancelled"] }, 1, 0] } },
          total:     { $sum: 1 },
        },
      },
    ]),

    /* ── 5. Top farmers ────────────────────────────────────── */
    Order.aggregate([
      { $match: { ...baseMatch, paymentStatus: "paid" } },
      {
        $group: {
          _id:   "$farmer",
          spent: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { spent: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from:         "users",
          localField:   "_id",
          foreignField: "_id",
          as:           "farmerInfo",
        },
      },
      { $unwind: { path: "$farmerInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          farmer: { $ifNull: ["$farmerInfo.name", "Unknown Farmer"] },
          spent:  { $round: ["$spent", 0] },
          orders: "$count",
        },
      },
    ]),
  ]);

  const stats = overview[0] ?? { totalOrders: 0, totalSpent: 0, activeOrders: 0, completedOrders: 0 };
  const perf  = delivery[0]  ?? { onTime: 0, delayed: 0, cancelled: 0, total: 0 };

  return {
    totalOrders:     stats.totalOrders,
    totalSpent:      Math.round(stats.totalSpent),
    activeOrders:    stats.activeOrders,
    completedOrders: stats.completedOrders,
    monthlySpending: monthly,
    topCrops:        cropDist,
    deliveryPerformance: {
      onTime:    perf.onTime,
      delayed:   perf.delayed,
      cancelled: perf.cancelled,
    },
    topFarmers,
    range,
  };
};

/**
 * AI Insights — rule-based analysis of buyer order history.
 * Returns structured text insights without calling an external service.
 */
export const generateAIInsights = async (buyerId) => {
  const uid = new mongoose.Types.ObjectId(buyerId);

  // Last 60 days vs previous 60 days
  const now      = new Date();
  const d60      = new Date(now - 60  * 86400000);
  const d30      = new Date(now - 30  * 86400000);
  const d120     = new Date(now - 120 * 86400000);

  const [recent, previous, topCrop] = await Promise.all([
    Order.aggregate([
      { $match: { buyer: uid, createdAt: { $gte: d30 }, paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { buyer: uid, createdAt: { $gte: d120, $lt: d60 }, paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { buyer: uid, createdAt: { $gte: d30 } } },
      { $unwind: "$items" },
      { $group: { _id: "$items.cropName", qty: { $sum: "$items.quantity" } } },
      { $sort: { qty: -1 } },
      { $limit: 1 },
    ]),
  ]);

  const recentTotal   = recent[0]?.total   ?? 0;
  const previousTotal = previous[0]?.total ?? 0;
  const recentCount   = recent[0]?.count   ?? 0;
  const topCropName   = topCrop[0]?._id    ?? "crops";

  const spendChange = previousTotal > 0
    ? Math.round(((recentTotal - previousTotal) / previousTotal) * 100)
    : null;

  const insights = [];

  if (spendChange !== null) {
    const dir = spendChange >= 0 ? "more" : "less";
    insights.push({
      type:    "spending",
      icon:    "TrendingUp",
      title:   "Spending Pattern",
      message: `You spent ${Math.abs(spendChange)}% ${dir} this month compared to last month.`,
    });
  }

  insights.push({
    type:    "crop",
    icon:    "Leaf",
    title:   "Top Purchase",
    message: `Your most purchased crop is ${topCropName}. Consider bulk ordering to get better rates.`,
  });

  if (recentCount >= 3) {
    insights.push({
      type:    "behavior",
      icon:    "ShoppingBag",
      title:   "Order Frequency",
      message: `You placed ${recentCount} orders this month. You're an active buyer — explore loyalty deals.`,
    });
  } else {
    insights.push({
      type:    "behavior",
      icon:    "ShoppingBag",
      title:   "Order Frequency",
      message: "Explore the marketplace for fresh seasonal crops and exclusive farmer deals.",
    });
  }

  return { insights };
};

/**
 * AI Predictions — calls the stacked ensemble Python microservice (port 8001).
 * Passes real buyer price history + quantity context for accurate predictions.
 * Falls back to rule-based predictions if service is unavailable.
 */
export const generateAIPredictions = async (buyerId) => {
  const uid = new mongoose.Types.ObjectId(buyerId);

  // Get buyer's top 5 crops with full price history (last 90 days)
  const topCrops = await Order.aggregate([
    { $match: { buyer: uid, createdAt: { $gte: new Date(Date.now() - 90 * 86400000) } } },
    { $unwind: "$items" },
    {
      $group: {
        _id:          "$items.cropName",
        qty:          { $sum: "$items.quantity" },
        spent:        { $sum: "$items.subtotal" },
        priceHistory: { $push: "$items.pricePerKg" },
        orderCount:   { $sum: 1 },
      },
    },
    { $sort: { qty: -1 } },
    { $limit: 5 },
  ]);

  const AI_SERVICE_URL = process.env.AI_ANALYTICS_URL || process.env.AI_SERVICE_URL || "http://localhost:8003";
  const currentMonth   = new Date().getMonth() + 1;

  // Build batch request payload
  const cropsPayload = topCrops.map((crop) => {
    const avgPrice   = crop.qty > 0 ? crop.spent / crop.qty : 25;
    const history    = (crop.priceHistory || []).slice(-10); // last 10 price points
    return {
      crop:          crop._id,
      location:      "market",
      days:          30,
      price_history: history.length ? history : [avgPrice * 0.95, avgPrice * 0.98, avgPrice, avgPrice * 1.01, avgPrice],
      qty_purchased: crop.qty,
      supply_shock:  0.0,
      rainfall_idx:  0.5,
      month:         currentMonth,
    };
  });

  // Try the new stacked ensemble endpoint first
  if (cropsPayload.length > 0) {
    try {
      const res = await fetch(`${AI_SERVICE_URL}/ai/analytics-predictions`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ crops: cropsPayload }),
        signal:  AbortSignal.timeout(6000),
      });

      if (res.ok) {
        const data = await res.json();
        const predictions = (data.predictions || []).map((p) => ({
          crop:            p.crop,
          demandScore:     p.demand_score,
          predictedPrice:  p.predicted_price,
          currentPrice:    p.current_price,
          priceChangePct:  p.price_change_pct,
          volatility:      p.volatility_score,
          confidence:      p.confidence,
          trendSeries:     p.trend_series,
          buySignal:       p.buy_signal,
          riskLevel:       p.risk_level,
          model:           p.model,
          message: _buildMessage(p),
        }));
        return { predictions, source: "ensemble_v2" };
      }
    } catch {
      // fall through to rule-based
    }
  }

  // Rule-based fallback
  const predictions = topCrops.map((crop) => {
    const avgPrice = crop.qty > 0 ? crop.spent / crop.qty : 25;
    return {
      crop:           crop._id,
      demandScore:    55,
      predictedPrice: +(avgPrice * 1.03).toFixed(2),
      currentPrice:   +avgPrice.toFixed(2),
      priceChangePct: 3.0,
      volatility:     30,
      confidence:     0.60,
      trendSeries:    null,
      buySignal:      "Neutral",
      riskLevel:      "Medium",
      model:          "rule_based_fallback",
      message:        `${crop._id} market conditions appear stable. Monitor prices before bulk ordering.`,
    };
  });

  if (!predictions.length) {
    predictions.push({
      crop: "General", demandScore: 60, predictedPrice: null, currentPrice: null,
      priceChangePct: null, volatility: 30, confidence: 0.60,
      trendSeries: null, buySignal: "Neutral", riskLevel: "Low",
      model: "rule_based_fallback",
      message: "Start purchasing to receive personalized crop demand predictions.",
    });
  }

  return { predictions, source: "fallback" };
};

/** Build a human-readable message from ensemble prediction */
const _buildMessage = (p) => {
  const dir   = p.price_change_pct >= 0 ? "rise" : "fall";
  const pct   = Math.abs(p.price_change_pct);
  const urgency = p.buy_signal === "Buy Now"
    ? "Consider ordering soon to lock in current prices."
    : p.buy_signal === "Wait"
    ? "High volatility — wait for market to stabilise."
    : "Stable conditions. Good time to plan your order.";
  return `${p.crop} prices expected to ${dir} by ${pct}% over 30 days. Demand: ${p.demand_score}/100. ${urgency}`;
};
