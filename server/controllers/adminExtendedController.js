import User from "../models/User.js";
import Consultation from "../models/Consultation.js";
import Advisory from "../models/Advisory.js";
import Wallet from "../models/Wallet.js";
import WalletTransaction from "../models/WalletTransaction.js";
import Order from "../models/Order.js";
import CommunityPost from "../models/CommunityPost.js";
import GovernmentScheme from "../models/GovernmentScheme.js";
import CropScanReport from "../models/CropScanReport.js";
import Review from "../models/Review.js";
import Notification from "../models/Notification.js";
import AdminActionLog from "../models/AdminActionLog.js";
import CropListing from "../models/CropListing.js";
import Payment from "../models/Payment.js";

const logAction = async (req, action, target, targetId, details = {}) => {
  try {
    await AdminActionLog.create({
      adminId: req.user._id,
      adminName: req.user.name,
      action, target,
      targetId: targetId?.toString(),
      details, ip: req.ip,
    });
  } catch (_) {}
};

const ok = (res, data, meta = {}) => res.status(200).json({ success: true, data, ...meta });

/* ═══════════════════════════════════════════════════════════
   CONSULTATION MANAGEMENT
═══════════════════════════════════════════════════════════ */
export const getAllConsultations = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) filter.$or = [
      { cropType: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
    const skip = (Number(page) - 1) * Number(limit);
    const [consultations, total] = await Promise.all([
      Consultation.find(filter)
        .sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
        .populate("expert", "name email")
        .populate("user", "name email")
        .lean(),
      Consultation.countDocuments(filter),
    ]);
    ok(res, consultations, { total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const getConsultationStats = async (req, res) => {
  try {
    const [total, pending, inProgress, completed, rejected, revenue] = await Promise.all([
      Consultation.countDocuments(),
      Consultation.countDocuments({ status: "pending" }),
      Consultation.countDocuments({ status: "in_progress" }),
      Consultation.countDocuments({ status: "completed" }),
      Consultation.countDocuments({ status: "rejected" }),
      Consultation.aggregate([
        { $match: { paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$consultationFee" } } },
      ]),
    ]);
    ok(res, { total, pending, inProgress, completed, rejected, revenue: revenue[0]?.total || 0 });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const updateConsultationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const c = await Consultation.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!c) return res.status(404).json({ message: "Not found" });
    await logAction(req, `Consultation status → ${status}`, "Consultation", req.params.id);
    ok(res, c);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ═══════════════════════════════════════════════════════════
   EXPERT MANAGEMENT
═══════════════════════════════════════════════════════════ */
export const getAllExperts = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const filter = { role: "expert" };
    if (search) filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
    const skip = (Number(page) - 1) * Number(limit);
    const [experts, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      User.countDocuments(filter),
    ]);

    // Enrich with consultation counts
    const enriched = await Promise.all(experts.map(async (e) => {
      const [consultCount, completedCount, revenue] = await Promise.all([
        Consultation.countDocuments({ expert: e._id }),
        Consultation.countDocuments({ expert: e._id, status: "completed" }),
        Consultation.aggregate([
          { $match: { expert: e._id, paymentStatus: "paid" } },
          { $group: { _id: null, total: { $sum: "$consultationFee" } } },
        ]),
      ]);
      return { ...e, consultCount, completedCount, totalEarnings: revenue[0]?.total || 0 };
    }));

    ok(res, enriched, { total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const getExpertPayouts = async (req, res) => {
  try {
    const pendingEscrow = await Order.find({ escrowReleased: false, orderStatus: "completed" })
      .populate("farmer", "name email")
      .lean();
    ok(res, pendingEscrow);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const releaseExpertPayout = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { escrowReleased: true, escrowReleasedAt: new Date() },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: "Order not found" });
    await logAction(req, "Escrow released", "Order", req.params.id);
    ok(res, order);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ═══════════════════════════════════════════════════════════
   ADVISORY MANAGEMENT
═══════════════════════════════════════════════════════════ */
export const getAllAdvisories = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    const skip = (Number(page) - 1) * Number(limit);
    const [advisories, total] = await Promise.all([
      Advisory.find(filter)
        .sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
        .populate("createdBy", "name email role")
        .lean(),
      Advisory.countDocuments(filter),
    ]);
    ok(res, advisories, { total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const updateAdvisoryStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const a = await Advisory.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!a) return res.status(404).json({ message: "Not found" });
    await logAction(req, `Advisory status → ${status}`, "Advisory", req.params.id);
    ok(res, a);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const deleteAdvisory = async (req, res) => {
  try {
    await Advisory.findByIdAndDelete(req.params.id);
    await logAction(req, "Advisory deleted", "Advisory", req.params.id);
    ok(res, { deleted: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ═══════════════════════════════════════════════════════════
   WALLET & ESCROW CONTROL
═══════════════════════════════════════════════════════════ */
export const getWalletOverview = async (req, res) => {
  try {
    const [walletStats, recentTxns, escrowOrders] = await Promise.all([
      Wallet.aggregate([
        { $group: {
          _id: null,
          totalBalance: { $sum: "$balance" },
          totalEscrow: { $sum: "$escrowBalance" },
          totalPending: { $sum: "$pendingPayments" },
          count: { $sum: 1 },
        }},
      ]),
      WalletTransaction.find()
        .sort({ createdAt: -1 }).limit(20)
        .populate("user", "name email role")
        .lean(),
      Order.find({ escrowReleased: false, orderStatus: "completed" })
        .populate("buyer", "name").populate("farmer", "name")
        .lean(),
    ]);
    ok(res, {
      stats: walletStats[0] || { totalBalance: 0, totalEscrow: 0, totalPending: 0, count: 0 },
      recentTransactions: recentTxns,
      pendingEscrow: escrowOrders,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const getAllWalletTransactions = async (req, res) => {
  try {
    const { category, type, page = 1, limit = 30 } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (type) filter.type = type;
    const skip = (Number(page) - 1) * Number(limit);
    const [txns, total] = await Promise.all([
      WalletTransaction.find(filter)
        .sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
        .populate("user", "name email role")
        .lean(),
      WalletTransaction.countDocuments(filter),
    ]);
    ok(res, txns, { total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ═══════════════════════════════════════════════════════════
   COMMUNITY MODERATION
═══════════════════════════════════════════════════════════ */
export const getAllCommunityPosts = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    const skip = (Number(page) - 1) * Number(limit);
    const [posts, total] = await Promise.all([
      CommunityPost.find(filter)
        .sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
        .populate("author", "name email role")
        .lean(),
      CommunityPost.countDocuments(filter),
    ]);
    ok(res, posts, { total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const updateCommunityPostStatus = async (req, res) => {
  try {
    const { status, isFeatured } = req.body;
    const update = {};
    if (status) update.status = status;
    if (isFeatured !== undefined) update.isFeatured = isFeatured;
    const post = await CommunityPost.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!post) return res.status(404).json({ message: "Not found" });
    await logAction(req, `Community post → ${JSON.stringify(update)}`, "CommunityPost", req.params.id);
    ok(res, post);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const deleteCommunityPost = async (req, res) => {
  try {
    await CommunityPost.findByIdAndDelete(req.params.id);
    await logAction(req, "Community post deleted", "CommunityPost", req.params.id);
    ok(res, { deleted: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ═══════════════════════════════════════════════════════════
   GOVERNMENT SCHEMES
═══════════════════════════════════════════════════════════ */
export const getAllSchemes = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    const skip = (Number(page) - 1) * Number(limit);
    const [schemes, total] = await Promise.all([
      GovernmentScheme.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      GovernmentScheme.countDocuments(filter),
    ]);
    ok(res, schemes, { total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const createScheme = async (req, res) => {
  try {
    const scheme = await GovernmentScheme.create(req.body);
    await logAction(req, "Scheme created", "GovernmentScheme", scheme._id);
    ok(res, scheme);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const updateScheme = async (req, res) => {
  try {
    const scheme = await GovernmentScheme.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!scheme) return res.status(404).json({ message: "Not found" });
    await logAction(req, "Scheme updated", "GovernmentScheme", req.params.id);
    ok(res, scheme);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const deleteScheme = async (req, res) => {
  try {
    await GovernmentScheme.findByIdAndDelete(req.params.id);
    await logAction(req, "Scheme deleted", "GovernmentScheme", req.params.id);
    ok(res, { deleted: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ═══════════════════════════════════════════════════════════
   AI SCAN REPORTS DEEP DIVE
═══════════════════════════════════════════════════════════ */
export const getScanReportsDeep = async (req, res) => {
  try {
    const { page = 1, limit = 20, cropType } = req.query;
    const filter = {};
    if (cropType) filter.cropType = { $regex: cropType, $options: "i" };
    const skip = (Number(page) - 1) * Number(limit);

    const [reports, total, topIssues, healthDist, riskStats] = await Promise.all([
      CropScanReport.find(filter)
        .sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
        .populate("user", "name email")
        .lean(),
      CropScanReport.countDocuments(filter),
      CropScanReport.aggregate([
        { $group: { _id: "$primaryIssue", count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 10 },
      ]),
      CropScanReport.aggregate([
        { $bucket: {
          groupBy: "$healthScore",
          boundaries: [0, 25, 50, 75, 100],
          default: "100",
          output: { count: { $sum: 1 } },
        }},
      ]),
      CropScanReport.aggregate([
        { $group: {
          _id: null,
          avgHealth: { $avg: "$healthScore" },
          highDisease: { $sum: { $cond: [{ $eq: ["$riskSnapshot.diseaseSpreadRisk", "High"] }, 1, 0] } },
          highPest: { $sum: { $cond: [{ $eq: ["$riskSnapshot.pestSpreadRisk", "High"] }, 1, 0] } },
        }},
      ]),
    ]);

    ok(res, { reports, topIssues, healthDist, riskStats: riskStats[0] || {} },
      { total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ═══════════════════════════════════════════════════════════
   REVIEW SENTIMENT & SPAM
═══════════════════════════════════════════════════════════ */
export const getReviewAnalytics = async (req, res) => {
  try {
    const [sentimentDist, spamRisk, topReported, ratingDist] = await Promise.all([
      Review.aggregate([
        { $group: { _id: "$sentiment", count: { $sum: 1 } } },
      ]),
      Review.find({ spamScore: { $gte: 0.6 } })
        .sort({ spamScore: -1 }).limit(10)
        .populate("reviewer", "name email").lean(),
      Review.find({ reportCount: { $gte: 2 } })
        .sort({ reportCount: -1 }).limit(10)
        .populate("reviewer", "name email").lean(),
      Review.aggregate([
        { $group: { _id: "$rating", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);
    ok(res, { sentimentDist, spamRisk, topReported, ratingDist });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ═══════════════════════════════════════════════════════════
   NOTIFICATION BROADCAST
═══════════════════════════════════════════════════════════ */
export const broadcastNotification = async (req, res) => {
  try {
    const { title, message, targetRole, type = "admin_broadcast" } = req.body;
    if (!title || !message) return res.status(400).json({ message: "title and message required" });

    const filter = {};
    if (targetRole && targetRole !== "all") filter.role = targetRole;
    const users = await User.find(filter).select("_id").lean();

    const notifications = users.map((u) => ({
      user: u._id,
      title,
      message,
      type,
      read: false,
    }));

    await Notification.insertMany(notifications, { ordered: false });
    await logAction(req, `Broadcast to ${targetRole || "all"}: ${title}`, "Notification", null);
    ok(res, { sentCount: notifications.length, targetRole: targetRole || "all" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ═══════════════════════════════════════════════════════════
   PLATFORM ANALYTICS (wiring expert-level data for admin)
═══════════════════════════════════════════════════════════ */
export const getPlatformAnalytics = async (req, res) => {
  try {
    const [
      usersByRole,
      ordersByStatus,
      consultationsByStatus,
      topCrops,
      revenueByGateway,
    ] = await Promise.all([
      User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
      Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Consultation.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      CropListing.aggregate([
        { $group: { _id: "$cropName", count: { $sum: 1 }, avgPrice: { $avg: "$pricePerKg" }, totalSold: { $sum: "$soldQuantity" } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Payment.aggregate([
        { $match: { status: "captured" } },
        { $group: { _id: "$paymentGateway", total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
    ]);

    ok(res, { usersByRole, ordersByStatus, consultationsByStatus, topCrops, revenueByGateway });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
