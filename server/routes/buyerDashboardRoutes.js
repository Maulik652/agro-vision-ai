import express from "express";
import {
  getBuyerDashboardSummary,
  getBuyerRecommendations,
  getMarketplaceDeals,
  getRecentOrders,
  getWalletSnapshot,
  getNotifications
} from "../controllers/buyerDashboardController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/summary", protect, getBuyerDashboardSummary);
router.get("/recommendations", protect, getBuyerRecommendations);
router.get("/marketplace-deals", protect, getMarketplaceDeals);
router.get("/orders", protect, getRecentOrders);
router.get("/wallet", protect, getWalletSnapshot);
router.get("/notifications", protect, getNotifications);

export default router;