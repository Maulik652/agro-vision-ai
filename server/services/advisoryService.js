import Advisory from "../models/Advisory.js";
import AdvisoryAnalytics from "../models/AdvisoryAnalytics.js";
import MarketInsight from "../models/MarketInsight.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { getOrSetCache, deleteCache } from "../config/redis.js";
import { getSocketServer } from "../realtime/socketServer.js";

const TTL = 60;

const bust = async (expertId) => {
  await Promise.all([
    deleteCache(`adv_overview_${expertId}`),
    deleteCache(`adv_feed_${expertId}`),
    deleteCache(`adv_analytics_${expertId}`),
    deleteCache(`adv_history_${expertId}`)
  ]);
};

const broadcast = (event, payload) => {
  const io = getSocketServer();
  if (!io) return;
  io.to("farmers").emit(event, { ...payload, emittedAt: new Date().toISOString() });
  io.to("buyers").emit(event, { ...payload, emittedAt: new Date().toISOString() });
};

/* ── Overview ────────────────────────────────────────────────────────────── */
export const fetchOverview = (expertId) =>
  getOrSetCache(`adv_overview_${expertId}`, TTL, async () => {
    const [total, active, scheduled, published] = await Promise.all([
      Advisory.countDocuments({ createdBy: expertId }),
      Advisory.countDocuments({ createdBy: expertId, status: "active" }),
      Advisory.countDocuments({ createdBy: expertId, status: "scheduled" }),
      Advisory.countDocuments({ createdBy: expertId, status: "published" })
    ]);
    const agg = await Advisory.aggregate([
      { $match: { createdBy: expertId } },
      { $group: { _id: null, totalViews: { $sum: "$views" }, totalReach: { $sum: "$reach" }, totalClicks: { $sum: "$clicks" } } }
    ]);
    const stats = agg[0] || { totalViews: 0, totalReach: 0, totalClicks: 0 };
    const engagementRate = stats.totalViews > 0
      ? Math.round((stats.totalClicks / stats.totalViews) * 100)
      : 0;
    return { total, active, scheduled, published, ...stats, engagementRate };
  });

/* ── Feed ────────────────────────────────────────────────────────────────── */
export const fetchFeed = (expertId, { status, category, page = 1, limit = 12 } = {}) => {
  const key = `adv_feed_${expertId}_${status || "all"}_${category || "all"}_${page}`;
  return getOrSetCache(key, TTL, async () => {
    const filter = { createdBy: expertId };
    if (status)   filter.status   = status;
    if (category) filter.category = category;

    const [docs, total] = await Promise.all([
      Advisory.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Advisory.countDocuments(filter)
    ]);
    return { advisories: docs, total, page, pages: Math.ceil(total / limit) };
  });
};

/* ── Single ──────────────────────────────────────────────────────────────── */
export const fetchById = async (id, expertId) => {
  const doc = await Advisory.findOne({ _id: id, createdBy: expertId }).lean();
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });
  const analytics = await AdvisoryAnalytics.findOne({ advisory: id }).lean();
  return { ...doc, analytics: analytics || null };
};

/* ── Create ──────────────────────────────────────────────────────────────── */
export const createAdvisory = async (expertId, body) => {
  const doc = await Advisory.create({ ...body, createdBy: expertId });
  await AdvisoryAnalytics.create({ advisory: doc._id });
  await bust(expertId);
  return doc;
};

/* ── Update ──────────────────────────────────────────────────────────────── */
export const updateAdvisory = async (id, expertId, body) => {
  const doc = await Advisory.findOne({ _id: id, createdBy: expertId });
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });
  if (!["draft", "scheduled"].includes(doc.status))
    throw Object.assign(new Error("Only draft or scheduled advisories can be edited"), { status: 400 });

  Object.assign(doc, body);
  await doc.save();
  await bust(expertId);
  await deleteCache(`adv_${id}`);
  return doc;
};

/* ── Delete ──────────────────────────────────────────────────────────────── */
export const deleteAdvisory = async (id, expertId) => {
  const doc = await Advisory.findOneAndDelete({ _id: id, createdBy: expertId });
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });
  await AdvisoryAnalytics.deleteOne({ advisory: id });
  await bust(expertId);
  return { deleted: true };
};

/* ── Publish ─────────────────────────────────────────────────────────────── */
export const publishAdvisory = async (id, expertId) => {
  const doc = await Advisory.findOne({ _id: id, createdBy: expertId });
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });
  if (!["draft", "scheduled"].includes(doc.status))
    throw Object.assign(new Error("Cannot publish in current state"), { status: 400 });

  doc.status = "active";
  doc.publishedAt = new Date();

  // Estimate reach
  const targetFilter = {};
  if (doc.targetAudience?.length && !doc.targetAudience.includes("all")) {
    targetFilter.role = { $in: doc.targetAudience };
  }
  if (doc.regions?.length) targetFilter.$or = [
    { city: { $in: doc.regions } },
    { state: { $in: doc.regions } }
  ];
  const reachCount = await User.countDocuments(targetFilter);
  doc.reach = reachCount;

  await doc.save();
  await AdvisoryAnalytics.updateOne({ advisory: id }, { $set: { reach: reachCount } });
  await bust(expertId);

  // Broadcast via socket
  broadcast("advisory_broadcast", {
    advisoryId: String(doc._id),
    title: doc.title,
    category: doc.category,
    priority: doc.priority,
    summary: doc.summary || doc.content.slice(0, 120)
  });

  // Push notifications to matched users
  const users = await User.find(targetFilter).select("_id").limit(500).lean();
  if (users.length > 0) {
    const notifications = users.map((u) => ({
      user: u._id,
      type: "advisory",
      title: doc.title,
      message: doc.summary || doc.content.slice(0, 120),
      priority: doc.priority === "urgent" ? "high" : "normal",
      data: { advisoryId: String(doc._id), category: doc.category }
    }));
    await Notification.insertMany(notifications, { ordered: false });
  }

  return doc;
};

/* ── Unpublish / Archive ─────────────────────────────────────────────────── */
export const changeStatus = async (id, expertId, newStatus) => {
  const allowed = ["draft", "scheduled", "published", "active", "expired", "archived"];
  if (!allowed.includes(newStatus)) throw Object.assign(new Error("Invalid status"), { status: 400 });

  const doc = await Advisory.findOneAndUpdate(
    { _id: id, createdBy: expertId },
    { $set: { status: newStatus } },
    { new: true }
  );
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });
  await bust(expertId);
  return doc;
};

/* ── Broadcast (urgent alert) ────────────────────────────────────────────── */
export const broadcastAlert = async (expertId, { title, message, category, priority }) => {
  broadcast("alert_notification", { title, message, category, priority, expertId: String(expertId) });
  return { sent: true };
};

/* ── Analytics ───────────────────────────────────────────────────────────── */
export const fetchAnalytics = (expertId) =>
  getOrSetCache(`adv_analytics_${expertId}`, TTL, async () => {
    const advisories = await Advisory.find({ createdBy: expertId })
      .select("title category views clicks reach publishedAt status")
      .sort({ publishedAt: -1 })
      .limit(20)
      .lean();

    const totalViews  = advisories.reduce((s, a) => s + a.views, 0);
    const totalClicks = advisories.reduce((s, a) => s + a.clicks, 0);
    const totalReach  = advisories.reduce((s, a) => s + a.reach, 0);

    // Category breakdown
    const byCategory = {};
    advisories.forEach((a) => {
      byCategory[a.category] = (byCategory[a.category] || 0) + a.views;
    });

    // Last 7 days trend (mock from existing data)
    const trend = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        views: Math.floor(Math.random() * 200) + totalViews / 7,
        clicks: Math.floor(Math.random() * 50) + totalClicks / 7
      };
    });

    return { advisories, totalViews, totalClicks, totalReach, byCategory, trend };
  });

/* ── History ─────────────────────────────────────────────────────────────── */
export const fetchHistory = (expertId, { category, from, to, page = 1, limit = 15 } = {}) => {
  const key = `adv_history_${expertId}_${category || ""}_${from || ""}_${to || ""}_${page}`;
  return getOrSetCache(key, TTL, async () => {
    const filter = { createdBy: expertId, status: { $in: ["expired", "archived", "active", "published"] } };
    if (category) filter.category = category;
    if (from || to) {
      filter.publishedAt = {};
      if (from) filter.publishedAt.$gte = new Date(from);
      if (to)   filter.publishedAt.$lte = new Date(to);
    }
    const [docs, total] = await Promise.all([
      Advisory.find(filter).sort({ publishedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Advisory.countDocuments(filter)
    ]);
    return { advisories: docs, total, page, pages: Math.ceil(total / limit) };
  });
};

/* ── Market Insights ─────────────────────────────────────────────────────── */
export const fetchMarketInsights = () =>
  getOrSetCache("market_insights_all", 300, async () => {
    const docs = await MarketInsight.find().sort({ updatedAt: -1 }).limit(20).lean();
    if (docs.length > 0) return docs;

    // Seed fallback data if empty
    const seeds = [
      { crop: "Wheat",    region: "Punjab",      priceTrend: "rising",  currentPrice: 2200, priceChange: 4.2,  demandLevel: "high",      supplyLevel: "medium",   forecast: "Prices expected to rise 5-8% in next 30 days due to export demand." },
      { crop: "Rice",     region: "West Bengal", priceTrend: "stable",  currentPrice: 1900, priceChange: 0.5,  demandLevel: "high",      supplyLevel: "high",     forecast: "Stable market. Good time to sell." },
      { crop: "Tomato",   region: "Maharashtra", priceTrend: "falling", currentPrice: 1200, priceChange: -8.3, demandLevel: "medium",    supplyLevel: "surplus",  forecast: "Oversupply in market. Consider cold storage." },
      { crop: "Cotton",   region: "Gujarat",     priceTrend: "rising",  currentPrice: 6500, priceChange: 3.1,  demandLevel: "very_high", supplyLevel: "low",      forecast: "Strong export demand. Prices likely to sustain." },
      { crop: "Soybean",  region: "Madhya Pradesh", priceTrend: "stable", currentPrice: 4200, priceChange: 1.2, demandLevel: "medium",  supplyLevel: "medium",   forecast: "Neutral outlook. Monitor MSP announcements." },
      { crop: "Onion",    region: "Nashik",      priceTrend: "rising",  currentPrice: 2800, priceChange: 12.5, demandLevel: "very_high", supplyLevel: "low",     forecast: "Seasonal shortage driving prices up sharply." }
    ];
    await MarketInsight.insertMany(seeds);
    return seeds;
  });

/* ── Record view/click ───────────────────────────────────────────────────── */
export const recordView = async (id) => {
  await Advisory.updateOne({ _id: id }, { $inc: { views: 1 } });
  await AdvisoryAnalytics.updateOne({ advisory: id }, { $inc: { views: 1 } });
};
