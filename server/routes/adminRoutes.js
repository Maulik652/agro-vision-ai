import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import {
  getDashboardStats,
  getAllUsers,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  getAllListings,
  updateListingStatus,
  getAllOrders,
  updateOrderStatus,
  getFinancialStats,
  getAIStats,
  getAllReviews,
  updateReviewStatus,
  getFraudAlerts,
  resolveFraudAlert,
  getReports,
  getSettings,
  updateSettings,
  getActivityLogs,
  getAutomationRules,
  createAutomationRule,
  updateAutomationRule,
  deleteAutomationRule,
  getNotificationsCenter,
  getLiveActivityStream,
  getAdminProfile,
} from "../controllers/adminController.js";

import {
  getAllConsultations,
  getConsultationStats,
  updateConsultationStatus,
  getAllExperts,
  getExpertPayouts,
  releaseExpertPayout,
  getAllAdvisories,
  updateAdvisoryStatus,
  deleteAdvisory,
  getWalletOverview,
  getAllWalletTransactions,
  getAllCommunityPosts,
  updateCommunityPostStatus,
  deleteCommunityPost,
  getAllSchemes,
  createScheme,
  updateScheme,
  deleteScheme,
  getScanReportsDeep,
  getReviewAnalytics,
  broadcastNotification,
  getPlatformAnalytics,
} from "../controllers/adminExtendedController.js";

const router = express.Router();

// All admin routes require auth + admin role
router.use(protect, authorize("admin"));

// Dashboard
router.get("/dashboard", getDashboardStats);
router.get("/live-activity", getLiveActivityStream);

// Users
router.get("/users", getAllUsers);
router.patch("/users/:id/status", updateUserStatus);
router.patch("/users/:id/role", updateUserRole);
router.delete("/users/:id", deleteUser);

// Listings / Marketplace
router.get("/listings", getAllListings);
router.patch("/listings/:id/status", updateListingStatus);

// Orders
router.get("/orders", getAllOrders);
router.patch("/orders/:id/status", updateOrderStatus);

// Financial
router.get("/financial", getFinancialStats);

// AI
router.get("/ai-stats", getAIStats);

// Reviews
router.get("/reviews", getAllReviews);
router.patch("/reviews/:id/status", updateReviewStatus);

// Fraud
router.get("/fraud-alerts", getFraudAlerts);
router.patch("/fraud-alerts/:id/resolve", resolveFraudAlert);

// Reports
router.get("/reports", getReports);

// Settings
router.get("/settings", getSettings);
router.put("/settings", updateSettings);

// Activity Logs
router.get("/activity-logs", getActivityLogs);

// Automation Rules
router.get("/automation-rules", getAutomationRules);
router.post("/automation-rules", createAutomationRule);
router.put("/automation-rules/:id", updateAutomationRule);
router.delete("/automation-rules/:id", deleteAutomationRule);

// Notifications
router.get("/notifications-center", getNotificationsCenter);

// Profile
router.get("/profile", getAdminProfile);

// Consultations
router.get("/consultations", getAllConsultations);
router.get("/consultations/stats", getConsultationStats);
router.patch("/consultations/:id/status", updateConsultationStatus);

// Experts
router.get("/experts", getAllExperts);
router.get("/experts/payouts", getExpertPayouts);
router.patch("/experts/payouts/:id/release", releaseExpertPayout);

// Advisories
router.get("/advisories", getAllAdvisories);
router.patch("/advisories/:id/status", updateAdvisoryStatus);
router.delete("/advisories/:id", deleteAdvisory);

// Wallet & Escrow
router.get("/wallet/overview", getWalletOverview);
router.get("/wallet/transactions", getAllWalletTransactions);

// Community
router.get("/community", getAllCommunityPosts);
router.patch("/community/:id/status", updateCommunityPostStatus);
router.delete("/community/:id", deleteCommunityPost);

// Government Schemes
router.get("/schemes", getAllSchemes);
router.post("/schemes", createScheme);
router.put("/schemes/:id", updateScheme);
router.delete("/schemes/:id", deleteScheme);

// AI Scan Deep Dive
router.get("/scan-reports", getScanReportsDeep);

// Review Analytics
router.get("/review-analytics", getReviewAnalytics);

// Broadcast Notification
router.post("/broadcast", broadcastNotification);

// Platform Analytics
router.get("/platform-analytics", getPlatformAnalytics);

export default router;
