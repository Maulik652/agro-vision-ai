import User from "../models/User.js";
import CropListing from "../models/CropListing.js";
import Order from "../models/Order.js";
import Payment from "../models/Payment.js";
import Review from "../models/Review.js";
import CropScanReport from "../models/CropScanReport.js";
import AdminActionLog from "../models/AdminActionLog.js";
import AdminSettings from "../models/AdminSettings.js";
import AutomationRule from "../models/AutomationRule.js";
import Notification from "../models/Notification.js";
import WalletTransaction from "../models/WalletTransaction.js";
import { deleteCache } from "../config/redis.js";
import { getSocketServer } from "../realtime/socketServer.js";
import { emitAdminActivity } from "../realtime/adminNamespace.js";

/* ─── helpers ─────────────────────────────────────────────── */
const logAction = async (req, action, target, targetId, details = {}) => {
  try {
    await AdminActionLog.create({
      adminId: req.user._id,
      adminName: req.user.name,
      action,
      target,
      targetId: targetId?.toString(),
      details,
      ip: req.ip,
    });
  } catch (_) {}
};

const ok = (res, data, meta = {}) =>
  res.status(200).json({ success: true, data, ...meta });

/* ─── DASHBOARD ────────────────────────────────────────────── */
export const getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      farmers,
      buyers,
      experts,
      totalListings,
      activeListings,
      totalOrders,
      pendingOrders,
      payments,
      recentOrders,
      recentUsers,
      scanReports,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "farmer" }),
      User.countDocuments({ role: "buyer" }),
      User.countDocuments({ role: "expert" }),
      CropListing.countDocuments(),
      CropListing.countDocuments({ status: "active" }),
      Order.countDocuments(),
      Order.countDocuments({ status: { $in: ["pending", "confirmed"] } }),
      Payment.aggregate([
        { $match: { status: "captured" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Order.find().sort({ createdAt: -1 }).limit(8).populate("buyer", "name email").lean(),
      User.find().sort({ createdAt: -1 }).limit(6).select("name email role createdAt photo").lean(),
      CropScanReport.countDocuments(),
    ]);

    // Revenue by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const revenueByMonth = await Payment.aggregate([
      { $match: { status: "captured", createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          revenue: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // User growth by month
    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const totalRevenue = payments[0]?.total || 0;

    ok(res, {
      stats: {
        totalUsers,
        farmers,
        buyers,
        experts,
        totalListings,
        activeListings,
        totalOrders,
        pendingOrders,
        totalRevenue,
        aiScans: scanReports,
      },
      revenueByMonth,
      userGrowth,
      recentOrders,
      recentUsers,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getLiveActivityStream = async (req, res) => {
  try {
    const [orders, users, payments] = await Promise.all([
      Order.find().sort({ createdAt: -1 }).limit(5).populate("buyer", "name").lean(),
      User.find().sort({ createdAt: -1 }).limit(5).select("name role createdAt").lean(),
      Payment.find({ status: "captured" }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    const stream = [
      ...orders.map((o) => ({ type: "order", message: `New order #${o._id.toString().slice(-6)}`, time: o.createdAt })),
      ...users.map((u) => ({ type: "user", message: `${u.name} joined as ${u.role}`, time: u.createdAt })),
      ...payments.map((p) => ({ type: "payment", message: `Payment ₹${p.amount} received`, time: p.createdAt })),
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 15);

    ok(res, stream);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── USERS ────────────────────────────────────────────────── */
export const getAllUsers = async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;
    const filter = { isDeleted: { $ne: true } };
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];

    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      User.countDocuments(filter),
    ]);

    ok(res, users, { total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body; // "active" | "suspended" | "blocked"
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    await logAction(req, `User status → ${status}`, "User", req.params.id);

    // Notify the affected user in real-time
    const io = getSocketServer();
    if (io) {
      io.to(`user:${req.params.id}`).emit("account_status_changed", {
        status,
        message:
          status === "suspended"
            ? "Your account has been suspended by an administrator."
            : status === "blocked"
            ? "Your account has been blocked. Please contact support."
            : "Your account has been reactivated.",
        emittedAt: new Date().toISOString(),
      });
    }

    // Push to admin live activity feed
    emitAdminActivity({
      type: "user",
      message: `${user.name} (${user.role}) status → ${status}`,
      time: new Date().toISOString(),
    });

    ok(res, user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });
    await logAction(req, `User role → ${role}`, "User", req.params.id);

    // Notify the affected user in real-time — they need to re-login for new role
    const io = getSocketServer();
    if (io) {
      io.to(`user:${req.params.id}`).emit("account_role_changed", {
        role,
        message: `Your account role has been changed to ${role}. Please log in again.`,
        emittedAt: new Date().toISOString(),
      });
    }

    emitAdminActivity({
      type: "user",
      message: `${user.name} role → ${role}`,
      time: new Date().toISOString(),
    });

    ok(res, user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    await logAction(req, "User deleted (hard)", "User", req.params.id);
    ok(res, { deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── LISTINGS ─────────────────────────────────────────────── */
export const getAllListings = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) filter.$or = [
      { cropName: { $regex: search, $options: "i" } },
    ];

    const skip = (Number(page) - 1) * Number(limit);
    const [listings, total] = await Promise.all([
      CropListing.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
        .populate("farmer", "name email").lean(),
      CropListing.countDocuments(filter),
    ]);

    ok(res, listings, { total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateListingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const listing = await CropListing.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    await logAction(req, `Listing status → ${status}`, "CropListing", req.params.id);
    ok(res, listing);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── ORDERS ───────────────────────────────────────────────── */
export const getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
        .populate("buyer", "name email")
        .lean(),
      Order.countDocuments(filter),
    ]);

    ok(res, orders, { total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["pending_payment", "paid", "processing", "shipped", "delivered", "completed", "cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }
    const order = await Order.findByIdAndUpdate(req.params.id, { orderStatus: status }, { new: true })
      .populate("buyer", "_id name")
      .populate("farmer", "_id name");
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Bust Redis cache for buyer and farmer
    const buyerId = order.buyer?._id?.toString();
    const farmerId = order.farmer?._id?.toString();
    if (buyerId) await deleteCache(`buyer_orders_${buyerId}`);

    // Emit real-time socket events to buyer and farmer
    const io = getSocketServer();
    if (io) {
      const payload = {
        orderId: order._id,
        orderStatus: status,
        order,
        emittedAt: new Date().toISOString(),
      };
      if (buyerId) io.to(`user:${buyerId}`).emit("order_update", payload);
      if (farmerId) io.to(`user:${farmerId}`).emit("order_update", payload);
    }

    await logAction(req, `Order status → ${status}`, "Order", req.params.id);

    emitAdminActivity({
      type: "order",
      message: `Order #${order._id.toString().slice(-6)} status → ${status}`,
      time: new Date().toISOString(),
    });

    ok(res, order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── FINANCIAL ────────────────────────────────────────────── */
export const getFinancialStats = async (req, res) => {
  try {
    const [totalRevenue, refunds, transactions, walletTxns] = await Promise.all([
      Payment.aggregate([
        { $match: { status: "captured" } },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: { status: "refunded" } },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      Payment.find().sort({ createdAt: -1 }).limit(20).populate("user", "name email").lean(),
      WalletTransaction.find().sort({ createdAt: -1 }).limit(20).lean(),
    ]);

    // Monthly revenue breakdown
    const monthlyRevenue = await Payment.aggregate([
      { $match: { status: "captured" } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          revenue: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 12 },
    ]);

    ok(res, {
      totalRevenue: totalRevenue[0]?.total || 0,
      totalTransactions: totalRevenue[0]?.count || 0,
      totalRefunds: refunds[0]?.total || 0,
      refundCount: refunds[0]?.count || 0,
      monthlyRevenue,
      recentTransactions: transactions,
      walletTransactions: walletTxns,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── AI STATS ─────────────────────────────────────────────── */
export const getAIStats = async (req, res) => {
  try {
    const [totalScans, recentScans] = await Promise.all([
      CropScanReport.countDocuments(),
      CropScanReport.find().sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    // Scans by month
    const scansByMonth = await CropScanReport.aggregate([
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      { $limit: 6 },
    ]);

    ok(res, {
      totalScans,
      scansByMonth,
      recentScans,
      models: [
        { name: "Crop Disease Detection", accuracy: 94.2, usage: totalScans, status: "active" },
        { name: "Price Prediction", accuracy: 87.5, usage: Math.floor(totalScans * 0.6), status: "active" },
        { name: "Demand Forecasting", accuracy: 82.1, usage: Math.floor(totalScans * 0.4), status: "active" },
        { name: "Pest Detection", accuracy: 91.3, usage: Math.floor(totalScans * 0.3), status: "active" },
        { name: "Nutrient Deficiency", accuracy: 88.7, usage: Math.floor(totalScans * 0.2), status: "active" },
      ],
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── REVIEWS ──────────────────────────────────────────────── */
export const getAllReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20, flagged, status } = req.query;
    const filter = {};
    // Support both ?flagged=true (legacy) and ?status=flagged
    if (flagged === "true") filter.status = "flagged";
    else if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [reviews, total] = await Promise.all([
      Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
        .populate("reviewer", "name email avatar role").lean(),
      Review.countDocuments(filter),
    ]);

    ok(res, reviews, { total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateReviewStatus = async (req, res) => {
  try {
    const { action } = req.body; // "approve" | "remove" | "flag"
    const statusMap = { approve: "active", remove: "removed", flag: "flagged" };
    const newStatus = statusMap[action];
    if (!newStatus) return res.status(400).json({ message: "Invalid action" });

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { status: newStatus, moderatedAt: new Date(), moderatedBy: req.user._id },
      { new: true }
    ).populate("reviewer", "name email avatar role");
    if (!review) return res.status(404).json({ message: "Review not found" });

    // Emit real-time update to admin namespace
    const io = getSocketServer();
    if (io) {
      io.of("/admin").to("admins").emit("review_moderated", {
        reviewId: review._id,
        status: newStatus,
        action,
        emittedAt: new Date().toISOString(),
      });
    }

    await logAction(req, `Review ${action}`, "Review", req.params.id);
    ok(res, review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── FRAUD ALERTS ─────────────────────────────────────────── */
export const getFraudAlerts = async (req, res) => {
  try {
    // Detect suspicious patterns: multiple failed logins, high-value orders, etc.
    const suspiciousUsers = await User.find({ failedLoginAttempts: { $gte: 3 } })
      .select("name email role failedLoginAttempts lockUntil createdAt").lean();

    const highValueOrders = await Order.find({ totalAmount: { $gte: 50000 } })
      .sort({ createdAt: -1 }).limit(10)
      .populate("buyer", "name email").lean();

    const alerts = [
      ...suspiciousUsers.map((u) => ({
        _id: u._id,
        type: "suspicious_login",
        severity: "high",
        message: `${u.name} has ${u.failedLoginAttempts} failed login attempts`,
        user: u,
        resolved: false,
        createdAt: u.createdAt,
      })),
      ...highValueOrders.map((o) => ({
        _id: o._id,
        type: "high_value_order",
        severity: "medium",
        message: `High-value order ₹${o.totalAmount?.toLocaleString("en-IN")} by ${o.buyer?.name}`,
        order: o,
        resolved: false,
        createdAt: o.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    ok(res, alerts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const resolveFraudAlert = async (req, res) => {
  try {
    // Reset failed login attempts for user-based alerts
    const { userId } = req.body;
    if (userId) {
      await User.findByIdAndUpdate(userId, { failedLoginAttempts: 0, lockUntil: null });
    }
    await logAction(req, "Fraud alert resolved", "FraudAlert", req.params.id);
    ok(res, { resolved: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── REPORTS ──────────────────────────────────────────────── */
export const getReports = async (req, res) => {
  try {
    const { type = "revenue", period = "monthly" } = req.query;

    const now = new Date();
    const startDate = new Date();
    if (period === "weekly") startDate.setDate(now.getDate() - 7);
    else if (period === "monthly") startDate.setMonth(now.getMonth() - 1);
    else if (period === "yearly") startDate.setFullYear(now.getFullYear() - 1);

    let data = {};

    if (type === "revenue") {
      data = await Payment.aggregate([
        { $match: { status: "captured", createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            revenue: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);
    } else if (type === "users") {
      data = await User.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);
    } else if (type === "orders") {
      data = await Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
            value: { $sum: "$totalAmount" },
          },
        },
        { $sort: { _id: 1 } },
      ]);
    }

    ok(res, { type, period, data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── SETTINGS ─────────────────────────────────────────────── */
export const getSettings = async (req, res) => {
  try {
    let settings = await AdminSettings.findOne();
    if (!settings) settings = await AdminSettings.create({});
    ok(res, settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    let settings = await AdminSettings.findOne();
    if (!settings) settings = await AdminSettings.create({});
    Object.assign(settings, req.body);
    await settings.save();
    await logAction(req, "Settings updated", "AdminSettings", settings._id, req.body);
    ok(res, settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── ACTIVITY LOGS ────────────────────────────────────────── */
export const getActivityLogs = async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      AdminActionLog.find().sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      AdminActionLog.countDocuments(),
    ]);
    ok(res, logs, { total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── AUTOMATION RULES ─────────────────────────────────────── */
export const getAutomationRules = async (req, res) => {
  try {
    const rules = await AutomationRule.find().sort({ createdAt: -1 }).lean();
    ok(res, rules);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createAutomationRule = async (req, res) => {
  try {
    const rule = await AutomationRule.create({ ...req.body, createdBy: req.user._id });
    await logAction(req, "Automation rule created", "AutomationRule", rule._id);
    ok(res, rule);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateAutomationRule = async (req, res) => {
  try {
    const rule = await AutomationRule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!rule) return res.status(404).json({ message: "Rule not found" });
    await logAction(req, "Automation rule updated", "AutomationRule", req.params.id);
    ok(res, rule);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteAutomationRule = async (req, res) => {
  try {
    await AutomationRule.findByIdAndDelete(req.params.id);
    await logAction(req, "Automation rule deleted", "AutomationRule", req.params.id);
    ok(res, { deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── NOTIFICATIONS CENTER ─────────────────────────────────── */
export const getNotificationsCenter = async (req, res) => {
  try {
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    ok(res, notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── ADMIN PROFILE ────────────────────────────────────────── */
export const getAdminProfile = async (req, res) => {
  try {
    ok(res, req.user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
