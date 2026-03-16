import axios from "axios";
import mongoose from "mongoose";
import { getOrSetCache } from "../config/redis.js";
import CropListing from "../models/CropListing.js";
import CropReview from "../models/CropReview.js";
import MarketTrend from "../models/MarketTrend.js";
import Notification from "../models/Notification.js";
import Order from "../models/Order.js";
import Wallet from "../models/Wallet.js";

/**
 * Buyer Dashboard Controller
 *
 * Architecture decisions:
 * - Each endpoint is independently cacheable so high-cost charts do not block lightweight cards.
 * - MongoDB aggregation pipelines are used for analytics to keep response generation close to data.
 * - AI calls are optional with deterministic fallbacks, keeping the API reliable when AI service is unavailable.
 */

const DASHBOARD_CACHE_TTL_SECONDS = 120;
const AI_SERVICE_URL = String(process.env.BUYER_AI_SERVICE_URL || "http://127.0.0.1:8001").replace(/\/$/, "");

const ACTIVE_ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped"];
const NON_CANCELLED_ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered"];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toObjectId = (value) =>
  value instanceof mongoose.Types.ObjectId
    ? value
    : new mongoose.Types.ObjectId(String(value));

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const round = (value, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round(toNumber(value, 0) * factor) / factor;
};

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const cachePrefix = (buyerId) => `dashboard_${buyerId}`;

const levelByVolatility = (score) => {
  if (score >= 65) {
    return "high";
  }

  if (score <= 32) {
    return "low";
  }

  return "medium";
};

const riskByVolatility = (score) => {
  if (score >= 65) {
    return "High Risk";
  }

  if (score <= 32) {
    return "Low Risk";
  }

  return "Medium Risk";
};

const demandLevelByScore = (score) => {
  if (score >= 72) {
    return "high";
  }

  if (score <= 40) {
    return "low";
  }

  return "medium";
};

const trendDirection = (recentCount, previousCount) => {
  const recent = toNumber(recentCount, 0);
  const previous = toNumber(previousCount, 0);

  if (recent >= (previous * 1.15) + 1) {
    return "rising";
  }

  if (previous >= (recent * 1.15) + 1) {
    return "falling";
  }

  return "stable";
};

const buildMonthAxis = (months = 12) => {
  const output = [];
  const anchor = new Date();
  anchor.setDate(1);
  anchor.setHours(0, 0, 0, 0);

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const point = new Date(anchor);
    point.setMonth(point.getMonth() - offset);

    output.push({
      key: `${point.getUTCFullYear()}-${String(point.getUTCMonth() + 1).padStart(2, "0")}`,
      label: point.toLocaleDateString("en-US", { month: "short" }),
      year: point.getUTCFullYear(),
      month: point.getUTCMonth() + 1
    });
  }

  return output;
};

const buildWeeklyAxis = (weeks = 8) => {
  const output = [];
  const now = new Date();

  for (let offset = weeks - 1; offset >= 0; offset -= 1) {
    const start = new Date(now);
    start.setDate(start.getDate() - (offset * 7));
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    output.push({
      start,
      end,
      key: `${start.toISOString().slice(0, 10)}_${end.toISOString().slice(0, 10)}`,
      label: `W${weeks - offset}`
    });
  }

  return output;
};

const volatilityFromPrices = (prices = []) => {
  const series = prices.map((value) => toNumber(value, NaN)).filter(Number.isFinite);

  if (series.length <= 1) {
    return 28;
  }

  const mean = series.reduce((sum, value) => sum + value, 0) / series.length;
  if (mean <= 0) {
    return 28;
  }

  const variance = series.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / series.length;
  return clamp(round((Math.sqrt(variance) / mean) * 100, 1), 5, 95);
};

const callAiEndpoint = async (path, payload) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}${path}`, payload, {
      timeout: 2800,
      headers: {
        "Content-Type": "application/json"
      }
    });

    return {
      success: true,
      data: response.data
    };
  } catch {
    return {
      success: false,
      data: null
    };
  }
};

const resolvePrimaryCrop = async (buyerObjectId) => {
  const topOrderCropRows = await Order.aggregate([
    {
      $match: {
        buyer: buyerObjectId,
        status: { $in: NON_CANCELLED_ORDER_STATUSES }
      }
    },
    {
      $group: {
        _id: "$cropName",
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 1 }
  ]);

  if (topOrderCropRows[0]?._id) {
    return String(topOrderCropRows[0]._id);
  }

  const topMarketCropRows = await MarketTrend.aggregate([
    {
      $match: {
        date: {
          $gte: new Date(Date.now() - (90 * 24 * 60 * 60 * 1000))
        }
      }
    },
    {
      $group: {
        _id: "$cropName",
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 1 }
  ]);

  return String(topMarketCropRows[0]?._id || "Wheat");
};

const getOverviewData = async (buyerObjectId) => {
  const [orderRows, wallet] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          buyer: buyerObjectId
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpending: { $sum: "$totalAmount" },
          activeOrders: {
            $sum: {
              $cond: [{ $in: ["$status", ACTIVE_ORDER_STATUSES] }, 1, 0]
            }
          }
        }
      }
    ]),
    Wallet.findOne({ user: buyerObjectId }).lean()
  ]);

  const stats = orderRows[0] || {};

  return {
    totalOrders: toNumber(stats.totalOrders, 0),
    totalSpending: round(stats.totalSpending, 2),
    walletBalance: round(wallet?.balance, 2),
    activeOrders: toNumber(stats.activeOrders, 0),
    currency: "INR",
    lastUpdatedAt: new Date().toISOString()
  };
};

const getPriceTrendsData = async ({ buyerObjectId, crop, days }) => {
  const daysValue = [30, 60, 90].includes(toNumber(days, 30)) ? toNumber(days, 30) : 30;
  const startDate = new Date(Date.now() - (daysValue * 24 * 60 * 60 * 1000));

  const availableCropRows = await MarketTrend.aggregate([
    {
      $match: {
        date: {
          $gte: new Date(Date.now() - (90 * 24 * 60 * 60 * 1000))
        }
      }
    },
    {
      $group: {
        _id: { $toLower: "$cropName" },
        cropName: { $first: "$cropName" },
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 20 }
  ]);

  const inferredCrop = String(crop || "").trim() || await resolvePrimaryCrop(buyerObjectId);
  const selectedCropRegex = new RegExp(`^${escapeRegex(inferredCrop)}$`, "i");

  const marketPoints = await MarketTrend.aggregate([
    {
      $match: {
        cropName: selectedCropRegex,
        date: { $gte: startDate }
      }
    },
    {
      $project: {
        day: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$date"
          }
        },
        price: "$pricePerKg",
        demand: "$demandScore"
      }
    },
    {
      $group: {
        _id: "$day",
        averagePrice: { $avg: "$price" },
        demandScore: { $avg: "$demand" }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  let points = marketPoints.map((row) => ({
    date: row._id,
    price: round(row.averagePrice, 2),
    demandScore: round(row.demandScore, 1)
  }));

  if (!points.length) {
    const orderFallbackRows = await Order.aggregate([
      {
        $match: {
          buyer: buyerObjectId,
          cropName: selectedCropRegex,
          createdAt: { $gte: startDate }
        }
      },
      {
        $project: {
          day: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt"
            }
          },
          price: "$pricePerUnit"
        }
      },
      {
        $group: {
          _id: "$day",
          averagePrice: { $avg: "$price" },
          demandScore: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    points = orderFallbackRows.map((row) => ({
      date: row._id,
      price: round(row.averagePrice, 2),
      demandScore: round(clamp(row.demandScore * 7, 10, 95), 1)
    }));
  }

  const firstPrice = points[0]?.price || 0;
  const currentPrice = points[points.length - 1]?.price || 0;
  const changePercent = firstPrice > 0
    ? round(((currentPrice - firstPrice) / firstPrice) * 100, 2)
    : 0;

  return {
    crop: inferredCrop,
    days: daysValue,
    availableCrops: availableCropRows.map((row) => row.cropName),
    points,
    summary: {
      currentPrice,
      averagePrice: points.length
        ? round(points.reduce((sum, item) => sum + toNumber(item.price, 0), 0) / points.length, 2)
        : 0,
      changePercent
    }
  };
};

const getRecommendationsData = async ({ buyer, limit, cropFilter }) => {
  const safeLimit = clamp(toNumber(limit, 6), 1, 15);

  const cropRows = await CropListing.aggregate([
    {
      $match: {
        isActive: true,
        status: "active"
      }
    },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: { $toLower: "$cropName" },
        cropName: { $first: "$cropName" },
        averagePrice: { $avg: "$price" },
        listingCount: { $sum: 1 },
        availability: { $sum: "$quantity" },
        image: { $first: "$image" }
      }
    },
    { $sort: { listingCount: -1, availability: -1 } },
    { $limit: Math.max(20, safeLimit * 2) }
  ]);

  const normalizedFilter = Array.isArray(cropFilter)
    ? cropFilter.map((item) => String(item || "").toLowerCase())
    : [];

  const filteredRows = normalizedFilter.length
    ? cropRows.filter((row) => normalizedFilter.includes(String(row.cropName || "").toLowerCase()))
    : cropRows;

  const candidateRows = filteredRows.slice(0, Math.max(8, safeLimit));
  const candidateNames = candidateRows.map((row) => row.cropName);

  const [demandRows, volatilityRows] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          status: { $in: NON_CANCELLED_ORDER_STATUSES },
          createdAt: { $gte: new Date(Date.now() - (45 * 24 * 60 * 60 * 1000)) },
          cropName: { $in: candidateNames }
        }
      },
      {
        $group: {
          _id: { $toLower: "$cropName" },
          orderCount: { $sum: 1 },
          quantity: { $sum: "$quantity" }
        }
      }
    ]),
    MarketTrend.aggregate([
      {
        $match: {
          cropName: { $in: candidateNames },
          date: { $gte: new Date(Date.now() - (45 * 24 * 60 * 60 * 1000)) }
        }
      },
      {
        $group: {
          _id: { $toLower: "$cropName" },
          meanPrice: { $avg: "$pricePerKg" },
          stdPrice: { $stdDevSamp: "$pricePerKg" }
        }
      }
    ])
  ]);

  const demandMap = new Map(
    demandRows.map((row) => [
      String(row._id),
      clamp((toNumber(row.orderCount, 0) * 7) + (toNumber(row.quantity, 0) * 0.06), 10, 95)
    ])
  );

  const volatilityMap = new Map(
    volatilityRows.map((row) => {
      const mean = toNumber(row.meanPrice, 0);
      const std = toNumber(row.stdPrice, 0);
      const volatility = mean > 0 ? clamp((std / mean) * 100, 8, 95) : 30;

      return [String(row._id), round(volatility, 1)];
    })
  );

  const aiPayload = {
    location: `${buyer?.city || "market"}, ${buyer?.state || "state"}`,
    crops: candidateRows.map((row) => ({
      crop: row.cropName,
      avg_price: round(row.averagePrice, 2),
      availability: toNumber(row.availability, 0),
      listing_count: toNumber(row.listingCount, 0)
    }))
  };

  const aiResponse = await callAiEndpoint("/ai/recommend-crops", aiPayload);
  const aiMap = new Map(
    (aiResponse.data?.recommendations || []).map((item) => [
      String(item.crop_name || "").toLowerCase(),
      item
    ])
  );

  const recommendations = candidateRows.map((row) => {
    const cropKey = String(row.cropName || "").toLowerCase();
    const ai = aiMap.get(cropKey);

    const fallbackDemand = toNumber(demandMap.get(cropKey), 52);
    const fallbackVolatility = toNumber(volatilityMap.get(cropKey), 28);

    const predictedPrice = ai?.predicted_price ?? round(toNumber(row.averagePrice, 0) * (1 + (fallbackDemand / 240)), 2);
    const demandScore = ai?.demand_score ?? fallbackDemand;
    const volatilityScore = ai?.volatility_score ?? fallbackVolatility;

    const rankingScore = ai?.ranking_score
      ?? round((demandScore * 0.62) - (volatilityScore * 0.24) + Math.log1p(toNumber(row.availability, 0)) * 4.4, 2);

    return {
      cropImage: row.image || "",
      cropName: row.cropName,
      predictedPrice: round(predictedPrice, 2),
      demandScore: round(demandScore, 1),
      riskIndicator: ai?.risk_indicator || riskByVolatility(volatilityScore),
      model: ai?.model || "xgboost+random_forest_fallback",
      rankingScore
    };
  });

  return recommendations
    .sort((left, right) => toNumber(right.rankingScore, 0) - toNumber(left.rankingScore, 0))
    .slice(0, safeLimit);
};

const getRecentOrdersData = async (buyerObjectId, limit = 8) => {
  const safeLimit = clamp(toNumber(limit, 8), 1, 25);

  const rows = await Order.aggregate([
    {
      $match: {
        buyer: buyerObjectId
      }
    },
    { $sort: { createdAt: -1 } },
    { $limit: safeLimit },
    {
      $lookup: {
        from: "users",
        localField: "farmer",
        foreignField: "_id",
        as: "farmerProfile",
        pipeline: [
          {
            $project: {
              _id: 0,
              name: 1
            }
          }
        ]
      }
    },
    {
      $project: {
        _id: 0,
        orderId: "$orderId",
        crop: "$cropName",
        farmer: {
          $ifNull: [{ $arrayElemAt: ["$farmerProfile.name", 0] }, "Unknown Farmer"]
        },
        quantity: "$quantity",
        quantityUnit: "$quantityUnit",
        status: "$status",
        createdAt: "$createdAt"
      }
    }
  ]);

  return rows;
};

const getSpendingData = async (buyerObjectId) => {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const monthlyRows = await Order.aggregate([
    {
      $match: {
        buyer: buyerObjectId,
        status: { $in: NON_CANCELLED_ORDER_STATUSES },
        createdAt: { $gte: twelveMonthsAgo }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" }
        },
        spending: { $sum: "$totalAmount" },
        orders: { $sum: 1 }
      }
    }
  ]);

  const monthlyMap = new Map(
    monthlyRows.map((row) => [
      `${row._id.year}-${String(row._id.month).padStart(2, "0")}`,
      {
        spending: round(row.spending, 2),
        orders: toNumber(row.orders, 0)
      }
    ])
  );

  const monthlySpending = buildMonthAxis(12).map((point) => ({
    month: point.label,
    spending: toNumber(monthlyMap.get(point.key)?.spending, 0),
    orders: toNumber(monthlyMap.get(point.key)?.orders, 0)
  }));

  const weeklyAxis = buildWeeklyAxis(8);

  const weeklyRows = await Promise.all(
    weeklyAxis.map(async (week) => {
      const [ordersCount, totalAmount] = await Promise.all([
        Order.countDocuments({
          buyer: buyerObjectId,
          status: { $in: NON_CANCELLED_ORDER_STATUSES },
          createdAt: {
            $gte: week.start,
            $lte: week.end
          }
        }),
        Order.aggregate([
          {
            $match: {
              buyer: buyerObjectId,
              status: { $in: NON_CANCELLED_ORDER_STATUSES },
              createdAt: {
                $gte: week.start,
                $lte: week.end
              }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$totalAmount" }
            }
          }
        ])
      ]);

      return {
        week: week.label,
        purchases: toNumber(ordersCount, 0),
        spending: round(totalAmount[0]?.total, 2)
      };
    })
  );

  return {
    monthlySpending,
    weeklyPurchases: weeklyRows
  };
};

const getTopFarmersData = async (buyerObjectId, limit = 6) => {
  const safeLimit = clamp(toNumber(limit, 6), 1, 12);

  const farmerRows = await Order.aggregate([
    {
      $match: {
        buyer: buyerObjectId,
        status: { $in: NON_CANCELLED_ORDER_STATUSES }
      }
    },
    {
      $group: {
        _id: "$farmer",
        ordersCount: { $sum: 1 },
        totalSpend: { $sum: "$totalAmount" }
      }
    },
    { $sort: { ordersCount: -1 } },
    { $limit: safeLimit },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "farmerUser",
        pipeline: [
          {
            $project: {
              _id: 0,
              name: 1
            }
          }
        ]
      }
    },
    {
      $project: {
        farmerId: "$_id",
        farmerName: {
          $ifNull: [{ $arrayElemAt: ["$farmerUser.name", 0] }, "Unknown Farmer"]
        },
        ordersCount: 1,
        totalSpend: 1
      }
    }
  ]);

  const farmerIds = farmerRows.map((row) => row.farmerId).filter(Boolean);

  const ratingRows = farmerIds.length
    ? await CropReview.aggregate([
      {
        $match: {
          buyerId: buyerObjectId,
          farmerId: { $in: farmerIds }
        }
      },
      {
        $group: {
          _id: "$farmerId",
          averageRating: { $avg: "$rating" }
        }
      }
    ])
    : [];

  const ratingMap = new Map(
    ratingRows.map((row) => [String(row._id), round(row.averageRating, 2)])
  );

  return farmerRows.map((row) => ({
    farmerName: row.farmerName,
    ordersCount: toNumber(row.ordersCount, 0),
    averageRating: toNumber(ratingMap.get(String(row.farmerId)), 4.5),
    totalSpend: round(row.totalSpend, 2)
  }));
};

const getAIInsightsData = async ({ buyerObjectId, buyer }) => {
  const crop = await resolvePrimaryCrop(buyerObjectId);
  const location = `${buyer?.city || "market"}, ${buyer?.state || "state"}`;

  const trendRows = await MarketTrend.aggregate([
    {
      $match: {
        cropName: new RegExp(`^${escapeRegex(crop)}$`, "i"),
        date: {
          $gte: new Date(Date.now() - (30 * 24 * 60 * 60 * 1000))
        }
      }
    },
    { $sort: { date: 1 } },
    {
      $project: {
        _id: 0,
        price: "$pricePerKg"
      }
    }
  ]);

  let priceHistory = trendRows.map((row) => toNumber(row.price, NaN)).filter(Number.isFinite);

  if (!priceHistory.length) {
    const orderHistoryRows = await Order.aggregate([
      {
        $match: {
          buyer: buyerObjectId,
          cropName: new RegExp(`^${escapeRegex(crop)}$`, "i")
        }
      },
      { $sort: { createdAt: 1 } },
      { $limit: 30 },
      {
        $project: {
          _id: 0,
          price: "$pricePerUnit"
        }
      }
    ]);

    priceHistory = orderHistoryRows.map((row) => toNumber(row.price, NaN)).filter(Number.isFinite);
  }

  const demandHintRows = await Order.aggregate([
    {
      $match: {
        buyer: buyerObjectId,
        cropName: new RegExp(`^${escapeRegex(crop)}$`, "i"),
        status: { $in: NON_CANCELLED_ORDER_STATUSES },
        createdAt: {
          $gte: new Date(Date.now() - (30 * 24 * 60 * 60 * 1000))
        }
      }
    },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalQuantity: { $sum: "$quantity" }
      }
    }
  ]);

  const demandHint = clamp(
    (toNumber(demandHintRows[0]?.totalOrders, 0) * 8) + (toNumber(demandHintRows[0]?.totalQuantity, 0) * 0.08),
    20,
    95
  );

  const [pricePrediction, demandForecast] = await Promise.all([
    callAiEndpoint("/ai/price-prediction", {
      crop,
      location,
      days: 30,
      price_history: priceHistory,
      demand_score: demandHint
    }),
    callAiEndpoint("/ai/demand-forecast", {
      crop,
      location,
      days: 30,
      price_history: priceHistory
    })
  ]);

  const fallbackVolatility = volatilityFromPrices(priceHistory);
  const predictedPrice = pricePrediction.success
    ? toNumber(pricePrediction.data?.predicted_price, 0)
    : round((priceHistory[priceHistory.length - 1] || priceHistory[0] || 25) * (1 + (demandHint / 300)), 2);

  const demandScore = demandForecast.success
    ? toNumber(demandForecast.data?.demand_score, demandHint)
    : demandHint;

  const volatilityScore = pricePrediction.success
    ? toNumber(pricePrediction.data?.volatility_score, fallbackVolatility)
    : fallbackVolatility;

  return {
    crop,
    predictedCropPrice: round(predictedPrice, 2),
    demandForecast: {
      score: round(demandScore, 1),
      level: demandLevelByScore(demandScore)
    },
    marketVolatility: {
      score: round(volatilityScore, 1),
      level: levelByVolatility(volatilityScore)
    },
    modelsUsed: {
      priceModel: pricePrediction.success
        ? String(pricePrediction.data?.model || "xgboost")
        : "xgboost_fallback",
      demandModel: demandForecast.success
        ? String(demandForecast.data?.model || "random_forest")
        : "random_forest_fallback"
    },
    generatedAt: new Date().toISOString()
  };
};

const getFavoriteCropsData = async (buyerObjectId, limit = 6) => {
  const safeLimit = clamp(toNumber(limit, 6), 1, 12);
  const recentStart = new Date(Date.now() - (14 * 24 * 60 * 60 * 1000));
  const previousStart = new Date(Date.now() - (28 * 24 * 60 * 60 * 1000));

  const favoriteRows = await Order.aggregate([
    {
      $match: {
        buyer: buyerObjectId,
        status: { $in: NON_CANCELLED_ORDER_STATUSES }
      }
    },
    {
      $group: {
        _id: { $toLower: "$cropName" },
        cropName: { $first: "$cropName" },
        purchaseCount: { $sum: 1 },
        averagePrice: { $avg: "$pricePerUnit" },
        recentCount: {
          $sum: {
            $cond: [{ $gte: ["$createdAt", recentStart] }, 1, 0]
          }
        },
        previousCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gte: ["$createdAt", previousStart] },
                  { $lt: ["$createdAt", recentStart] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    },
    { $sort: { purchaseCount: -1 } },
    { $limit: safeLimit }
  ]);

  const cropNames = favoriteRows.map((row) => row.cropName);

  const imageRows = cropNames.length
    ? await CropListing.aggregate([
      {
        $match: {
          cropName: { $in: cropNames },
          image: { $exists: true, $ne: "" }
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: { $toLower: "$cropName" },
          image: { $first: "$image" }
        }
      }
    ])
    : [];

  const imageMap = new Map(
    imageRows.map((row) => [String(row._id), row.image])
  );

  return favoriteRows.map((row) => {
    const key = String(row._id);

    return {
      cropName: row.cropName,
      cropImage: imageMap.get(key) || "",
      averagePrice: round(row.averagePrice, 2),
      demandTrend: trendDirection(row.recentCount, row.previousCount),
      purchases: toNumber(row.purchaseCount, 0)
    };
  });
};

const getDashboardNotificationsData = async (buyerObjectId, limit = 10) => {
  const safeLimit = clamp(toNumber(limit, 10), 1, 30);

  const rows = await Notification.find({ user: buyerObjectId })
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .lean();

  return rows.map((row) => ({
    id: String(row._id),
    type: row.type,
    title: row.title,
    message: row.message,
    priority: row.priority,
    read: Boolean(row.read),
    createdAt: row.createdAt
  }));
};

const sendServerError = (res, message, error) => {
  return res.status(500).json({
    success: false,
    message,
    detail: error.message
  });
};

export const getDashboardOverview = async (req, res) => {
  try {
    const buyerId = String(req.user._id);
    const buyerObjectId = toObjectId(req.user._id);

    const data = await getOrSetCache(
      `${cachePrefix(buyerId)}_overview`,
      DASHBOARD_CACHE_TTL_SECONDS,
      () => getOverviewData(buyerObjectId)
    );

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendServerError(res, "Unable to fetch dashboard overview", error);
  }
};

export const getDashboardPriceTrends = async (req, res) => {
  try {
    const buyerId = String(req.user._id);
    const buyerObjectId = toObjectId(req.user._id);

    const query = req.validatedQuery || {};
    const selectedCrop = String(query.crop || "").trim();
    const days = toNumber(query.days, 30);

    const cacheKeyCrop = selectedCrop || "auto";

    const data = await getOrSetCache(
      `${cachePrefix(buyerId)}_price_trends_${cacheKeyCrop.toLowerCase()}_${days}`,
      DASHBOARD_CACHE_TTL_SECONDS,
      () => getPriceTrendsData({ buyerObjectId, crop: selectedCrop, days })
    );

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendServerError(res, "Unable to fetch market price trends", error);
  }
};

export const getDashboardRecommendations = async (req, res) => {
  try {
    const buyerId = String(req.user._id);
    const query = req.validatedQuery || {};
    const limit = toNumber(query.limit, 6);
    const cropFilter = query.cropFilter || [];

    const data = await getOrSetCache(
      `${cachePrefix(buyerId)}_recommendations_${limit}_${String(cropFilter.join("|")).toLowerCase() || "all"}`,
      DASHBOARD_CACHE_TTL_SECONDS,
      () => getRecommendationsData({
        buyer: req.user,
        limit,
        cropFilter
      })
    );

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendServerError(res, "Unable to fetch AI crop recommendations", error);
  }
};

export const getDashboardRecentOrders = async (req, res) => {
  try {
    const buyerId = String(req.user._id);
    const buyerObjectId = toObjectId(req.user._id);
    const limit = toNumber(req.validatedQuery?.limit, 8);

    const data = await getOrSetCache(
      `${cachePrefix(buyerId)}_recent_orders_${limit}`,
      DASHBOARD_CACHE_TTL_SECONDS,
      () => getRecentOrdersData(buyerObjectId, limit)
    );

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendServerError(res, "Unable to fetch recent orders", error);
  }
};

export const getDashboardSpending = async (req, res) => {
  try {
    const buyerId = String(req.user._id);
    const buyerObjectId = toObjectId(req.user._id);

    const data = await getOrSetCache(
      `${cachePrefix(buyerId)}_spending`,
      DASHBOARD_CACHE_TTL_SECONDS,
      () => getSpendingData(buyerObjectId)
    );

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendServerError(res, "Unable to fetch spending analytics", error);
  }
};

export const getDashboardTopFarmers = async (req, res) => {
  try {
    const buyerId = String(req.user._id);
    const buyerObjectId = toObjectId(req.user._id);
    const limit = toNumber(req.validatedQuery?.limit, 6);

    const data = await getOrSetCache(
      `${cachePrefix(buyerId)}_top_farmers_${limit}`,
      DASHBOARD_CACHE_TTL_SECONDS,
      () => getTopFarmersData(buyerObjectId, limit)
    );

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendServerError(res, "Unable to fetch top farmers", error);
  }
};

export const getDashboardAIInsights = async (req, res) => {
  try {
    const buyerId = String(req.user._id);
    const buyerObjectId = toObjectId(req.user._id);

    const data = await getOrSetCache(
      `${cachePrefix(buyerId)}_ai_insights`,
      DASHBOARD_CACHE_TTL_SECONDS,
      () => getAIInsightsData({
        buyerObjectId,
        buyer: req.user
      })
    );

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendServerError(res, "Unable to fetch AI market insights", error);
  }
};

export const getDashboardFavoriteCrops = async (req, res) => {
  try {
    const buyerId = String(req.user._id);
    const buyerObjectId = toObjectId(req.user._id);
    const limit = toNumber(req.validatedQuery?.limit, 6);

    const data = await getOrSetCache(
      `${cachePrefix(buyerId)}_favorite_crops_${limit}`,
      DASHBOARD_CACHE_TTL_SECONDS,
      () => getFavoriteCropsData(buyerObjectId, limit)
    );

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendServerError(res, "Unable to fetch favorite crops", error);
  }
};

export const getDashboardNotifications = async (req, res) => {
  try {
    const buyerId = String(req.user._id);
    const buyerObjectId = toObjectId(req.user._id);

    const data = await getOrSetCache(
      `${cachePrefix(buyerId)}_notifications`,
      30,
      () => getDashboardNotificationsData(buyerObjectId, 10)
    );

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendServerError(res, "Unable to fetch dashboard notifications", error);
  }
};