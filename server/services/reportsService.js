import CropListing from "../models/CropListing.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import CropPriceHistory from "../models/CropPriceHistory.js";
import Consultation from "../models/Consultation.js";
import Advisory from "../models/Advisory.js";
import { getOrSetCache } from "../config/redis.js";
import axios from "axios";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
const TTL = 120;

const buildDateMatch = (from, to) => {
  if (!from && !to) return {};
  const range = {};
  if (from) range.$gte = new Date(from);
  if (to)   range.$lte = new Date(to);
  return { createdAt: range };
};

const buildCropMatch = (crop) =>
  crop ? { cropName: { $regex: crop, $options: "i" } } : {};

const buildRegionMatch = (region) =>
  region ? { "location.city": { $regex: region, $options: "i" } } : {};

/* ─── 1. Overview KPIs ─── */
export const fetchOverview = async () =>
  getOrSetCache("reports_overview", TTL, async () => {
    const [listings, orders, aiStats] = await Promise.all([
      CropListing.countDocuments(),
      Order.aggregate([
        { $match: { orderStatus: { $in: ["completed", "delivered"] } } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalAmount" },
            totalOrders:  { $sum: 1 },
            totalVolume:  { $sum: { $sum: "$items.quantity" } }
          }
        }
      ]),
      CropListing.aggregate([
        { $match: { aiSuggestedPrice: { $ne: null }, price: { $gt: 0 } } },
        {
          $group: {
            _id: null,
            avgConfidence: { $avg: "$aiConfidence" },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const o = orders[0] || {};
    const ai = aiStats[0] || {};
    return {
      totalListings:   listings,
      totalRevenue:    o.totalRevenue || 0,
      totalOrders:     o.totalOrders  || 0,
      totalVolume:     o.totalVolume  || 0,
      aiAccuracy:      ai.avgConfidence ? Math.round(ai.avgConfidence) : 0
    };
  });

/* ─── 2. Market Trends ─── */
export const fetchMarketTrends = async (filters = {}) => {
  const key = `reports_market_trends_${JSON.stringify(filters)}`;
  return getOrSetCache(key, TTL, async () => {
    const match = {
      ...buildDateMatch(filters.from, filters.to),
      ...buildCropMatch(filters.crop)
    };
    return CropPriceHistory.aggregate([
      { $match: { ...(filters.from || filters.to ? { date: match.createdAt } : {}), ...(filters.crop ? { cropName: { $regex: filters.crop, $options: "i" } } : {}) } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            crop: "$cropName"
          },
          avgPrice: { $avg: "$price" }
        }
      },
      { $sort: { "_id.date": 1 } },
      { $project: { _id: 0, date: "$_id.date", crop: "$_id.crop", avgPrice: { $round: ["$avgPrice", 2] } } }
    ]);
  });
};

/* ─── 3. Demand vs Supply ─── */
export const fetchDemandSupply = async (filters = {}) => {
  const key = `reports_demand_supply_${JSON.stringify(filters)}`;
  return getOrSetCache(key, TTL, async () => {
    const dateMatch = buildDateMatch(filters.from, filters.to);
    const cropMatch = buildCropMatch(filters.crop);

    const [supply, demand] = await Promise.all([
      CropListing.aggregate([
        { $match: { ...dateMatch, ...cropMatch } },
        { $group: { _id: "$cropName", supply: { $sum: "$quantity" }, listings: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: { ...dateMatch } },
        { $unwind: "$items" },
        { $group: { _id: "$items.cropName", demand: { $sum: "$items.quantity" }, orders: { $sum: 1 } } }
      ])
    ]);

    const map = {};
    supply.forEach(s => { map[s._id] = { crop: s._id, supply: s.supply, listings: s.listings, demand: 0, orders: 0 }; });
    demand.forEach(d => {
      if (!map[d._id]) map[d._id] = { crop: d._id, supply: 0, listings: 0 };
      map[d._id].demand = d.demand;
      map[d._id].orders = d.orders;
    });

    return Object.values(map)
      .map(r => ({ ...r, gap: r.demand - r.supply }))
      .sort((a, b) => b.demand - a.demand)
      .slice(0, 15);
  });
};

/* ─── 4. Crop Performance ─── */
export const fetchCropPerformance = async (filters = {}) => {
  const key = `reports_crop_perf_${JSON.stringify(filters)}`;
  return getOrSetCache(key, TTL, async () => {
    const dateMatch = buildDateMatch(filters.from, filters.to);
    const cropMatch = buildCropMatch(filters.crop);

    return Order.aggregate([
      { $match: { ...dateMatch, orderStatus: { $in: ["completed", "delivered"] } } },
      { $unwind: "$items" },
      ...(filters.crop ? [{ $match: { "items.cropName": { $regex: filters.crop, $options: "i" } } }] : []),
      {
        $group: {
          _id: "$items.cropName",
          totalRevenue: { $sum: "$items.subtotal" },
          totalVolume:  { $sum: "$items.quantity" },
          totalOrders:  { $sum: 1 },
          avgPrice:     { $avg: "$items.pricePerKg" }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 15 },
      {
        $project: {
          _id: 0,
          crop: "$_id",
          totalRevenue: { $round: ["$totalRevenue", 2] },
          totalVolume:  1,
          totalOrders:  1,
          avgPrice:     { $round: ["$avgPrice", 2] }
        }
      }
    ]);
  });
};

/* ─── 5. Region Analysis ─── */
export const fetchRegionAnalysis = async (filters = {}) => {
  const key = `reports_region_${JSON.stringify(filters)}`;
  return getOrSetCache(key, TTL, async () => {
    const dateMatch = buildDateMatch(filters.from, filters.to);

    const [listings, orders] = await Promise.all([
      CropListing.aggregate([
        { $match: { ...dateMatch } },
        { $group: { _id: "$location.city", listings: { $sum: 1 }, avgPrice: { $avg: "$price" } } },
        { $sort: { listings: -1 } },
        { $limit: 12 }
      ]),
      Order.aggregate([
        { $match: { ...dateMatch } },
        {
          $lookup: {
            from: "croplistings",
            localField: "items.crop",
            foreignField: "_id",
            as: "cropData"
          }
        },
        { $unwind: { path: "$cropData", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: "$cropData.location.city",
            revenue: { $sum: "$totalAmount" },
            orders:  { $sum: 1 }
          }
        },
        { $sort: { revenue: -1 } },
        { $limit: 12 }
      ])
    ]);

    const map = {};
    listings.forEach(l => { map[l._id] = { region: l._id, listings: l.listings, avgPrice: Math.round(l.avgPrice || 0), revenue: 0, orders: 0 }; });
    orders.forEach(o => {
      if (o._id && map[o._id]) {
        map[o._id].revenue = Math.round(o.revenue || 0);
        map[o._id].orders  = o.orders;
      }
    });

    return Object.values(map).sort((a, b) => b.listings - a.listings);
  });
};

/* ─── 6. AI Performance ─── */
export const fetchAIPerformance = async () =>
  getOrSetCache("reports_ai_perf", TTL, async () => {
    const data = await CropListing.aggregate([
      { $match: { aiSuggestedPrice: { $ne: null }, price: { $gt: 0 } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            crop: "$cropName"
          },
          predicted: { $avg: "$aiSuggestedPrice" },
          actual:    { $avg: "$price" },
          confidence:{ $avg: "$aiConfidence" },
          count:     { $sum: 1 }
        }
      },
      { $sort: { "_id.date": 1 } },
      {
        $project: {
          _id: 0,
          date:       "$_id.date",
          crop:       "$_id.crop",
          predicted:  { $round: ["$predicted", 2] },
          actual:     { $round: ["$actual", 2] },
          confidence: { $round: ["$confidence", 1] },
          errorRate: {
            $round: [{
              $multiply: [
                { $divide: [{ $abs: { $subtract: ["$predicted", "$actual"] } }, "$actual"] },
                100
              ]
            }, 2]
          }
        }
      }
    ]);
    return data;
  });

/* ─── 7. User Analytics ─── */
export const fetchUserAnalytics = async (filters = {}) => {
  const key = `reports_user_analytics_${JSON.stringify(filters)}`;
  return getOrSetCache(key, TTL, async () => {
    const dateMatch = buildDateMatch(filters.from, filters.to);

    const [farmers, buyers, consultations] = await Promise.all([
      User.aggregate([
        { $match: { role: "farmer", ...dateMatch } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            newFarmers: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      User.aggregate([
        { $match: { role: "buyer", ...dateMatch } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            newBuyers: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Consultation.aggregate([
        { $match: { ...dateMatch } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            total:     { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    const months = {};
    farmers.forEach(f => { months[f._id] = { month: f._id, newFarmers: f.newFarmers, newBuyers: 0, consultations: 0, completedConsultations: 0 }; });
    buyers.forEach(b => { if (!months[b._id]) months[b._id] = { month: b._id, newFarmers: 0, newBuyers: 0, consultations: 0, completedConsultations: 0 }; months[b._id].newBuyers = b.newBuyers; });
    consultations.forEach(c => { if (!months[c._id]) months[c._id] = { month: c._id, newFarmers: 0, newBuyers: 0 }; months[c._id].consultations = c.total; months[c._id].completedConsultations = c.completed; });

    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month));
  });
};

/* ─── 8. AI Insights ─── */
export const generateAIInsights = async (data) => {
  try {
    const res = await axios.post(`${AI_SERVICE_URL}/api/report-insights`, { data }, { timeout: 8000 });
    return res.data?.insights || generateFallbackInsights(data);
  } catch {
    return generateFallbackInsights(data);
  }
};

const generateFallbackInsights = (data) => {
  const insights = [];
  if (data.overview) {
    insights.push(`Platform has ${data.overview.totalListings} active crop listings with ₹${(data.overview.totalRevenue || 0).toLocaleString()} in total revenue.`);
    if (data.overview.aiAccuracy > 0) insights.push(`AI price prediction model is operating at ${data.overview.aiAccuracy}% average confidence.`);
  }
  if (data.demandSupply?.length) {
    const top = data.demandSupply[0];
    if (top.gap > 0) insights.push(`${top.crop} shows a supply gap of ${top.gap.toFixed(0)} units — high demand opportunity for farmers.`);
  }
  if (data.cropPerformance?.length) {
    const top = data.cropPerformance[0];
    insights.push(`${top.crop} is the top-performing crop with ₹${(top.totalRevenue || 0).toLocaleString()} in revenue.`);
  }
  if (data.regionAnalysis?.length) {
    const top = data.regionAnalysis[0];
    insights.push(`${top.region} leads regional activity with ${top.listings} listings.`);
  }
  if (!insights.length) insights.push("Insufficient data to generate insights. Add more listings and orders to unlock AI-powered analysis.");
  return insights;
};
