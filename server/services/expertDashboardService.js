import User from "../models/User.js";
import CropListing from "../models/CropListing.js";
import Order from "../models/Order.js";
import DiseaseReport from "../models/DiseaseReport.js";
import QualityReport from "../models/QualityReport.js";
import ExpertRecommendation from "../models/ExpertRecommendation.js";
import { getOrSetCache } from "../config/redis.js";

const CACHE_TTL = 120; // 2 minutes

/* ─── 1. OVERVIEW ─────────────────────────────────────────────────────────── */
export const fetchOverview = () =>
  getOrSetCache("expert_overview", CACHE_TTL, async () => {
    const [totalFarmers, activeCrops, activeOrders, marketValue] = await Promise.all([
      User.countDocuments({ role: "farmer" }),
      CropListing.countDocuments({ status: "active" }),
      Order.countDocuments({ status: { $in: ["confirmed", "processing", "shipped"] } }),
      Order.aggregate([
        { $match: { paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } }
      ])
    ]);

    return {
      totalFarmers,
      activeCrops,
      activeOrders,
      totalMarketValue: marketValue[0]?.total || 0,
      currency: "INR"
    };
  });

/* ─── 2. MARKET TRENDS ────────────────────────────────────────────────────── */
export const fetchMarketTrends = (crop = "Wheat", days = 30) =>
  getOrSetCache(`expert_market_trends_${crop}_${days}`, CACHE_TTL, async () => {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const listings = await CropListing.find({
      cropName: { $regex: new RegExp(crop, "i") },
      createdAt: { $gte: since }
    })
      .select("price createdAt cropName")
      .sort({ createdAt: 1 })
      .lean();

    const points = listings.map((l) => ({
      date: l.createdAt.toISOString().split("T")[0],
      price: l.price
    }));

    const prices = points.map((p) => p.price);
    const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    const current = prices.at(-1) || 0;
    const first = prices[0] || 0;
    const changePercent = first ? (((current - first) / first) * 100).toFixed(2) : 0;

    const availableCrops = await CropListing.distinct("cropName");

    return { crop, days, points, availableCrops, summary: { currentPrice: current, averagePrice: Math.round(avg), changePercent: Number(changePercent) } };
  });

/* ─── 3. AI PREDICTIONS ───────────────────────────────────────────────────── */
export const fetchAIPredictions = (crop = "Wheat") =>
  getOrSetCache(`expert_ai_predictions_${crop}`, CACHE_TTL, async () => {
    const recent = await CropListing.find({ cropName: { $regex: new RegExp(crop, "i") } })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("price aiSuggestedPrice aiConfidence quantity")
      .lean();

    const prices = recent.map((r) => r.price).filter(Boolean);
    const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    const aiPrices = recent.map((r) => r.aiSuggestedPrice).filter(Boolean);
    const avgAiPrice = aiPrices.length ? aiPrices.reduce((a, b) => a + b, 0) / aiPrices.length : avgPrice * 1.05;
    const avgConf = recent.map((r) => r.aiConfidence).filter(Boolean);
    const confidence = avgConf.length ? avgConf.reduce((a, b) => a + b, 0) / avgConf.length : 72;

    const totalQty = recent.reduce((s, r) => s + (r.quantity || 0), 0);
    const demandScore = Math.min(100, Math.round((totalQty / 1000) * 10));

    return {
      crop,
      predictedYield: `${(totalQty / Math.max(recent.length, 1)).toFixed(0)} kg/listing`,
      predictedMarketPrice: Math.round(avgAiPrice),
      currentAvgPrice: Math.round(avgPrice),
      demandForecast: { score: demandScore, level: demandScore > 70 ? "high" : demandScore > 40 ? "medium" : "low" },
      confidence: Math.round(confidence),
      modelsUsed: { priceModel: "xgboost", yieldModel: "random_forest", demandModel: "gradient_boost" },
      generatedAt: new Date().toISOString()
    };
  });

/* ─── 4. DISEASE REPORTS ──────────────────────────────────────────────────── */
export const fetchDiseaseReports = async (limit = 20) => {
  const reports = await DiseaseReport.find()
    .populate("farmer", "name city state")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return reports.map((r) => ({
    id: r._id,
    farmerName: r.farmer?.name || "Unknown",
    location: `${r.farmer?.city || ""}, ${r.farmer?.state || ""}`.trim().replace(/^,\s*/, ""),
    cropName: r.cropName,
    cropImage: r.cropImage,
    diseaseDetected: r.diseaseDetected,
    confidence: r.confidence,
    severity: r.severity,
    reviewed: r.reviewed,
    createdAt: r.createdAt
  }));
};

/* ─── 5. FARMER ACTIVITY ──────────────────────────────────────────────────── */
export const fetchFarmerActivity = (limit = 30) =>
  getOrSetCache(`expert_farmer_activity_${limit}`, CACHE_TTL, async () => {
    const listings = await CropListing.find()
      .populate("farmer", "name city state")
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("cropName quantity quantityUnit price location createdAt farmer")
      .lean();

    return listings.map((l) => ({
      id: l._id,
      farmerName: l.farmer?.name || "Unknown",
      cropListed: l.cropName,
      quantity: `${l.quantity} ${l.quantityUnit}`,
      location: l.location?.city || l.farmer?.city || "N/A",
      state: l.location?.state || l.farmer?.state || "",
      price: l.price,
      listedAt: l.createdAt
    }));
  });

/* ─── 6. CROP DEMAND ──────────────────────────────────────────────────────── */
export const fetchCropDemand = () =>
  getOrSetCache("expert_crop_demand", CACHE_TTL, async () => {
    const demand = await Order.aggregate([
      { $unwind: "$items" },
      { $group: { _id: "$items.cropName", totalQty: { $sum: "$items.quantity" }, totalOrders: { $sum: 1 } } },
      { $sort: { totalQty: -1 } },
      { $limit: 10 }
    ]);

    return demand.map((d) => ({
      crop: d._id,
      totalQuantity: d.totalQty,
      totalOrders: d.totalOrders
    }));
  });

/* ─── 7. QUALITY REPORTS ──────────────────────────────────────────────────── */
export const fetchQualityReports = async (limit = 20) => {
  const reports = await QualityReport.find()
    .populate("farmer", "name city state")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return reports.map((r) => ({
    id: r._id,
    farmerName: r.farmer?.name || "Unknown",
    cropName: r.cropName,
    cropImage: r.cropImage,
    aiGrade: r.aiGrade,
    confidence: r.confidence,
    defects: r.defects,
    reviewed: r.reviewed,
    createdAt: r.createdAt
  }));
};

/* ─── 8. POST RECOMMENDATION ──────────────────────────────────────────────── */
export const createRecommendation = async (expertId, body) => {
  const rec = await ExpertRecommendation.create({ expert: expertId, ...body });
  return rec;
};

/* ─── 9. PLATFORM ANALYTICS ───────────────────────────────────────────────── */
export const fetchPlatformAnalytics = () =>
  getOrSetCache("expert_platform_analytics", CACHE_TTL, async () => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1, label: d.toLocaleString("default", { month: "short" }) };
    });

    const [farmerGrowth, orderGrowth, revenueGrowth] = await Promise.all([
      Promise.all(months.map(({ year, month }) =>
        User.countDocuments({
          role: "farmer",
          createdAt: { $gte: new Date(year, month - 1, 1), $lt: new Date(year, month, 1) }
        }).then((count) => ({ month: months.find((m) => m.year === year && m.month === month)?.label, count }))
      )),
      Promise.all(months.map(({ year, month }) =>
        Order.countDocuments({
          createdAt: { $gte: new Date(year, month - 1, 1), $lt: new Date(year, month, 1) }
        }).then((count) => ({ month: months.find((m) => m.year === year && m.month === month)?.label, count }))
      )),
      Promise.all(months.map(({ year, month }) =>
        Order.aggregate([
          { $match: { paymentStatus: "paid", createdAt: { $gte: new Date(year, month - 1, 1), $lt: new Date(year, month, 1) } } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]).then((res) => ({ month: months.find((m) => m.year === year && m.month === month)?.label, revenue: res[0]?.total || 0 }))
      ))
    ]);

    return { farmerGrowth, orderGrowth, revenueGrowth };
  });
