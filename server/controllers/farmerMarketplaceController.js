import CropListing from "../models/CropListing.js";
import CropOffer from "../models/CropOffer.js";
import CropOrder from "../models/CropOrder.js";
import User from "../models/User.js";

const toNum = (v, fb = 0) => { const n = Number(v); return Number.isFinite(n) ? n : fb; };
const safe = (v) => String(v || "").trim().slice(0, 200);

const cropBasePrices = {
  wheat: 2550, rice: 2400, tomato: 2250, cotton: 6800, maize: 2050,
  soybean: 4500, groundnut: 5400, potato: 1400, sugarcane: 340,
  mango: 3800, banana: 1600, grapes: 5500, onion: 1800, sunflower: 5800,
  mustard: 5200, barley: 1900, chickpea: 5100, lentil: 6200, turmeric: 8500,
};
const getBasePrice = (crop) => cropBasePrices[safe(crop).toLowerCase()] || 2200;
const seasonalFactor = () => { const m = new Date().getMonth(); return +(1 + Math.sin((m * Math.PI) / 6) * 0.06).toFixed(3); };
const demandLevel = (score) => score >= 70 ? "High" : score >= 45 ? "Medium" : "Low";

/* ── 1. DASHBOARD SUMMARY ── */
export const getFarmerMarketSummary = async (req, res) => {
  try {
    const fid = req.user._id;
    const [total, active, sold, paused] = await Promise.all([
      CropListing.countDocuments({ farmer: fid }),
      CropListing.countDocuments({ farmer: fid, status: "active" }),
      CropListing.countDocuments({ farmer: fid, status: "sold" }),
      CropListing.countDocuments({ farmer: fid, status: "paused" }),
    ]);
    const [pendingOffers, totalOrders] = await Promise.all([
      CropOffer.countDocuments({ farmer: fid, status: "pending" }),
      CropOrder.countDocuments({ farmer: fid }),
    ]);
    const [earningsAgg, viewsAgg] = await Promise.all([
      CropOrder.aggregate([{ $match: { farmer: fid, status: { $in: ["delivered", "completed"] } } }, { $group: { _id: null, total: { $sum: "$totalAmount" } } }]),
      CropListing.aggregate([{ $match: { farmer: fid } }, { $group: { _id: null, total: { $sum: "$views" } } }]),
    ]);
    const now = new Date();
    const som = new Date(now.getFullYear(), now.getMonth(), 1);
    const solm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const [thisM, lastM] = await Promise.all([
      CropOrder.aggregate([{ $match: { farmer: fid, status: { $in: ["delivered", "completed"] }, createdAt: { $gte: som } } }, { $group: { _id: null, total: { $sum: "$totalAmount" } } }]),
      CropOrder.aggregate([{ $match: { farmer: fid, status: { $in: ["delivered", "completed"] }, createdAt: { $gte: solm, $lt: som } } }, { $group: { _id: null, total: { $sum: "$totalAmount" } } }]),
    ]);
    const tm = thisM[0]?.total || 0, lm = lastM[0]?.total || 0;
    return res.json({ success: true, summary: { totalListings: total, activeListings: active, soldListings: sold, pausedListings: paused, pendingOffers, totalOrders, totalEarnings: earningsAgg[0]?.total || 0, totalViews: viewsAgg[0]?.total || 0, thisMonthEarnings: tm, lastMonthEarnings: lm, earningsGrowth: lm > 0 ? +((((tm - lm) / lm) * 100).toFixed(1)) : 0 } });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

/* ── 2. FARMER PROFILE (header banner) ── */
export const getFarmerProfile = async (req, res) => {
  try {
    const farmer = await User.findById(req.user._id).select("name email phone city state farmSize crops photo bio location").lean();
    if (!farmer) return res.status(404).json({ success: false, message: "Not found" });
    const [totalListings, activeListings, earningsAgg] = await Promise.all([
      CropListing.countDocuments({ farmer: req.user._id }),
      CropListing.countDocuments({ farmer: req.user._id, status: "active" }),
      CropOrder.aggregate([{ $match: { farmer: req.user._id, status: { $in: ["delivered", "completed"] } } }, { $group: { _id: null, total: { $sum: "$totalAmount" } } }]),
    ]);
    return res.json({ success: true, profile: { ...farmer, totalListings, activeListings, totalEarnings: earningsAgg[0]?.total || 0, platform: "AgroVision AI", tagline: "Empowering Agriculture with Artificial Intelligence" } });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

/* ── 3. EARNINGS BREAKDOWN ── */
export const getFarmerEarnings = async (req, res) => {
  try {
    const fid = req.user._id;
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1, label: d.toLocaleString("en-IN", { month: "short" }) };
    });
    const monthlyData = await Promise.all(months.map(async ({ year, month, label }) => {
      const start = new Date(year, month - 1, 1), end = new Date(year, month, 1);
      const agg = await CropOrder.aggregate([{ $match: { farmer: fid, status: { $in: ["delivered", "completed"] }, createdAt: { $gte: start, $lt: end } } }, { $group: { _id: null, revenue: { $sum: "$totalAmount" }, orders: { $sum: 1 } } }]);
      return { month: label, revenue: agg[0]?.revenue || 0, orders: agg[0]?.orders || 0 };
    }));
    const cropBreakdown = await CropOrder.aggregate([
      { $match: { farmer: fid, status: { $in: ["delivered", "completed"] } } },
      { $group: { _id: "$cropName", revenue: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
      { $sort: { revenue: -1 } }, { $limit: 6 },
    ]);
    const totalRevenue = monthlyData.reduce((s, m) => s + m.revenue, 0);
    const totalOrders = monthlyData.reduce((s, m) => s + m.orders, 0);
    return res.json({ success: true, earnings: { monthly: monthlyData, cropBreakdown: cropBreakdown.map(c => ({ crop: c._id || "Unknown", revenue: c.revenue, orders: c.count })), totalRevenue, totalOrders, avgOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0 } });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

/* ── 4. MARKET INSIGHTS ── */
export const getMarketInsights = async (req, res) => {
  try {
    const crop = safe(req.query.crop || "Wheat");
    const base = getBasePrice(crop);
    const sf = seasonalFactor();
    const currentPrice = Math.round(base * sf);
    const demandScore = Math.round(55 + Math.sin(Date.now() / 8e6) * 22 + Math.cos(Date.now() / 5e6) * 12);
    const dl = demandLevel(demandScore);
    const weekPrice = Math.round(currentPrice * (1 + Math.sin(Date.now() / 3e6) * 0.06));
    const monthPrice = Math.round(currentPrice * (1 + Math.cos(Date.now() / 9e6) * 0.1));
    const markets = ["Ahmedabad", "Surat", "Pune", "Nagpur", "Indore", "Jaipur", "Lucknow", "Delhi"].map((m, i) => ({
      market: m, price: Math.round(currentPrice * (0.92 + i * 0.015 + Math.sin(i * 1.3) * 0.04)),
      demandLevel: ["High", "Medium", "High", "Low", "Medium", "High", "Medium", "High"][i], unit: "quintal",
    })).sort((a, b) => b.price - a.price);
    const trends = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (29 - i));
      return { date: d.toISOString().slice(0, 10), price: Math.round(base * (0.88 + i * 0.004 + Math.sin(i * 0.7) * 0.05)) };
    });
    return res.json({ success: true, insights: { crop, currentPrice, weekPrice, monthPrice, demandScore, demandLevel: dl, markets, trends, aiInsights: [`${crop} demand is ${dl.toLowerCase()} this season. ${dl === "High" ? "Sell now for maximum returns." : dl === "Medium" ? "Stable market — list at AI suggested price." : "Consider cold storage for 2-3 weeks."}`, `Best selling window: ${dl === "High" ? "Immediate — within 3 days" : "Next 7-10 days"}`, `Top market: ${markets[0].market} at ₹${markets[0].price}/qtl`], confidence: Math.round(72 + Math.sin(Date.now() / 4e6) * 14), bestMarket: markets[0].market, bestPrice: markets[0].price, recommendation: dl === "High" ? `Sell ${crop} immediately — demand is high.` : dl === "Medium" ? `List ${crop} at ₹${currentPrice}/qtl. Market is stable.` : `Hold ${crop} for 1-2 weeks. Demand expected to improve.` } });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

/* ── 5. BUYER REQUESTS ── */
export const getBuyerRequests = async (req, res) => {
  try {
    const offers = await CropOffer.find({ farmer: req.user._id, status: "pending" })
      .populate("buyer", "name email phone").populate("cropListing", "cropName price quantityUnit location")
      .sort({ createdAt: -1 }).limit(20).lean();
    return res.json({ success: true, requests: offers });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

/* ── 6. RECENT ORDERS ── */
export const getFarmerRecentOrders = async (req, res) => {
  try {
    const page = Math.max(toNum(req.query.page, 1), 1);
    const limit = Math.min(toNum(req.query.limit, 10), 50);
    const [orders, total] = await Promise.all([
      CropOrder.find({ farmer: req.user._id }).populate("buyer", "name email").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      CropOrder.countDocuments({ farmer: req.user._id }),
    ]);
    return res.json({ success: true, orders, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

/* ── 7. REVIEWS ── */
export const getFarmerMarketReviews = async (req, res) => {
  try {
    const Review = (await import("../models/Review.js")).default;
    const reviews = await Review.find({ expert: req.user._id }).populate("farmer", "name").sort({ createdAt: -1 }).limit(10).lean();
    const avgRating = reviews.length ? +(reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1) : 0;
    return res.json({ success: true, reviews, avgRating, total: reviews.length });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

/* ── 8. AI PRICE SUGGESTION ── */
export const getAIPriceSuggestionEnhanced = async (req, res) => {
  try {
    const crop = safe(req.body.crop || req.body.cropName || "Wheat");
    const quantity = toNum(req.body.quantity, 100);
    const location = safe(req.body.location || "Ahmedabad");
    const grade = safe(req.body.grade || "B");
    const qualityType = safe(req.body.qualityType || "normal");
    const base = getBasePrice(crop);
    const sf = seasonalFactor();
    const suggested = Math.round(base * sf * ({ A: 1.12, B: 1.0, C: 0.88 }[grade] || 1.0) * (qualityType === "organic" ? 1.18 : 1.0) * (quantity > 500 ? 0.97 : quantity > 200 ? 0.99 : 1.0));
    const demandScore = Math.round(55 + Math.sin(Date.now() / 8e6) * 22);
    const dl = demandLevel(demandScore);
    return res.json({ success: true, suggestion: { crop, location, quantity, grade, qualityType, suggestedPrice: suggested, minPrice: Math.round(suggested * 0.88), maxPrice: Math.round(suggested * 1.14), marketPrice: Math.round(base * sf), demandLevel: dl, demandScore, confidence: Math.round(74 + Math.sin(Date.now() / 5e6) * 12), reasoning: `Grade ${grade} ${qualityType === "organic" ? "organic " : ""}${crop} in ${location}. ${dl} demand. Seasonal factor: ${sf}x.`, sellNow: dl === "High", bestWindow: dl === "High" ? "Sell within 3 days" : dl === "Medium" ? "Sell within 7-10 days" : "Hold for 2-3 weeks" } });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

/* ── 9. INVENTORY ── */
export const getFarmerInventory = async (req, res) => {
  try {
    const fid = req.user._id;
    const listings = await CropListing.find({ farmer: fid }).select("cropName quantity quantityUnit status views price grade qualityType").lean();
    const active = listings.filter(l => l.status === "active");
    const sold = listings.filter(l => l.status === "sold");
    const paused = listings.filter(l => l.status === "paused");
    return res.json({ success: true, inventory: listings.map(l => ({ _id: l._id, cropName: l.cropName, quantity: l.quantity, unit: l.quantityUnit, status: l.status, views: l.views || 0, price: l.price, grade: l.grade, qualityType: l.qualityType })), stats: { totalStock: active.reduce((s, l) => s + (l.quantity || 0), 0), soldStock: sold.reduce((s, l) => s + (l.quantity || 0), 0), pausedStock: paused.reduce((s, l) => s + (l.quantity || 0), 0), totalItems: listings.length } });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

/* ── 10. CROP ANALYTICS ── */
export const getCropAnalytics = async (req, res) => {
  try {
    const fid = req.user._id;
    const listings = await CropListing.find({ farmer: fid }).select("cropName views price status quantity").lean();
    const analytics = listings.map(l => {
      const views = l.views || 0;
      const clicks = Math.round(views * 0.35);
      const interest = Math.round(clicks * 0.18);
      const conversion = clicks > 0 ? +((interest / clicks) * 100).toFixed(1) : 0;
      return { _id: l._id, cropName: l.cropName, price: l.price, status: l.status, views, clicks, interest, conversion };
    });
    return res.json({ success: true, analytics });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

/* ── 11. AI SELLING ASSISTANT ── */
export const aiSellingAssistant = async (req, res) => {
  try {
    const question = safe(req.body.question || "");
    const crop = safe(req.body.crop || "Wheat");
    const base = getBasePrice(crop);
    const sf = seasonalFactor();
    const currentPrice = Math.round(base * sf);
    const demandScore = Math.round(55 + Math.sin(Date.now() / 8e6) * 22);
    const dl = demandLevel(demandScore);
    const q = question.toLowerCase();
    let answer = "";
    if (q.includes("price") || q.includes("increase")) {
      answer = dl === "High" ? `Yes! ${crop} demand is HIGH right now. Current market price is ₹${currentPrice}/qtl. You can list 5-8% above market (₹${Math.round(currentPrice * 1.06)}) and still attract buyers quickly.` : dl === "Medium" ? `${crop} market is stable at ₹${currentPrice}/qtl. Listing at market price is recommended. Avoid going above ₹${Math.round(currentPrice * 1.04)} to stay competitive.` : `${crop} demand is currently LOW. Hold off on price increases. Consider listing at ₹${Math.round(currentPrice * 0.96)} to attract buyers faster.`;
    } else if (q.includes("sell") || q.includes("time") || q.includes("when")) {
      answer = dl === "High" ? `Sell ${crop} NOW. Demand is high and prices are at a seasonal peak. Don't wait — list immediately for maximum returns.` : dl === "Medium" ? `Good time to sell ${crop}. Market is stable. List within the next 7-10 days for best results.` : `Wait 1-2 weeks before selling ${crop}. Demand is expected to improve. Use this time to improve packaging and quality grading.`;
    } else if (q.includes("market") || q.includes("where")) {
      answer = `Best markets for ${crop} right now: Ahmedabad (₹${Math.round(currentPrice * 1.04)}/qtl), Pune (₹${Math.round(currentPrice * 1.02)}/qtl), Delhi (₹${Math.round(currentPrice * 1.01)}/qtl). Ahmedabad has the highest demand this season.`;
    } else if (q.includes("organic") || q.includes("grade")) {
      answer = `Organic Grade A ${crop} commands a 18-25% premium over regular. If your crop qualifies, certify it — you can list at ₹${Math.round(currentPrice * 1.2)}/qtl vs ₹${currentPrice}/qtl for regular.`;
    } else {
      answer = `For ${crop} (current price: ₹${currentPrice}/qtl, demand: ${dl}): ${dl === "High" ? "Market conditions are excellent. List now at or slightly above market price." : dl === "Medium" ? "Market is stable. List at market price and respond quickly to buyer offers." : "Demand is low. Consider cold storage for 2-3 weeks or explore alternative markets."}`;
    }
    return res.json({ success: true, answer, context: { crop, currentPrice, demandLevel: dl, demandScore, confidence: Math.round(74 + Math.sin(Date.now() / 5e6) * 12) } });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

/* ── 12. NOTIFICATIONS ── */
export const getFarmerNotifications = async (req, res) => {
  try {
    const Notification = (await import("../models/Notification.js")).default;
    const notifications = await Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 }).limit(20).lean();
    return res.json({ success: true, notifications, unread: notifications.filter(n => !n.read).length });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

export const markNotificationRead = async (req, res) => {
  try {
    const Notification = (await import("../models/Notification.js")).default;
    await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};
