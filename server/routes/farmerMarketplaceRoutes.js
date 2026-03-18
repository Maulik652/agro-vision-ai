import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import {
  getFarmerMarketSummary,
  getFarmerProfile,
  getFarmerEarnings,
  getMarketInsights,
  getBuyerRequests,
  getFarmerRecentOrders,
  updateCropOrderStatus,
  getFarmerMarketReviews,
  getAIPriceSuggestionEnhanced,
  getFarmerInventory,
  getCropAnalytics,
  aiSellingAssistant,
  getFarmerNotifications,
  markNotificationRead,
} from "../controllers/farmerMarketplaceController.js";

const router = express.Router();
router.use(protect, authorize("farmer", "admin"));

router.get("/summary",              getFarmerMarketSummary);
router.get("/profile",              getFarmerProfile);
router.get("/earnings",             getFarmerEarnings);
router.get("/market-insights",      getMarketInsights);
router.get("/buyer-requests",       getBuyerRequests);
router.get("/orders",               getFarmerRecentOrders);
router.patch("/orders/:id",         updateCropOrderStatus);
router.get("/reviews",              getFarmerMarketReviews);
router.post("/ai-price",            getAIPriceSuggestionEnhanced);
router.get("/inventory",            getFarmerInventory);
router.get("/crop-analytics",       getCropAnalytics);
router.post("/ai-assistant",        aiSellingAssistant);
router.get("/notifications",        getFarmerNotifications);
router.patch("/notifications/read-all", markNotificationRead);

export default router;
