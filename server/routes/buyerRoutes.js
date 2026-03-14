import express from "express";
import { z } from "zod";
import { authorize, protect } from "../middleware/authMiddleware.js";
import { createRouteRateLimiter } from "../middleware/rateLimitMiddleware.js";
import { validateQuery } from "../middleware/zodValidate.js";
import {
  getMyBuyerProfile,
  getNearbyBuyers,
  getSmartBuyerAlerts,
  upsertBuyerProfile
} from "../controllers/buyerController.js";
import {
  getBuyerDashboardInsights,
  getBuyerPriceTrends,
  getBuyerRecommendations,
  getBuyerWallet,
  getBuyerOrders,
  getBuyerAnalytics
} from "../controllers/buyerDashboardController.js";

const router = express.Router();

const dashboardLimiter = createRouteRateLimiter({
  windowMs: 60_000,
  max: 120,
  message: "Too many dashboard requests, please wait a moment."
});

const dashboardQuerySchema = z.object({
  crop: z.string().optional(),
  days: z.preprocess((value) => {
    if (typeof value === "string" && value.trim()) return Number(value);
    if (typeof value === "number") return value;
    return undefined;
  }, z.number().min(7).max(90).optional()),
  status: z.string().optional(),
  limit: z.preprocess((value) => {
    if (typeof value === "string" && value.trim()) return Number(value);
    if (typeof value === "number") return value;
    return undefined;
  }, z.number().min(1).max(100).optional())
});

router.get("/", protect, authorize("farmer", "buyer", "admin"), getNearbyBuyers);
router.get("/alerts", protect, authorize("farmer", "buyer", "admin"), getSmartBuyerAlerts);
router.get("/me", protect, authorize("buyer", "admin"), getMyBuyerProfile);
router.post("/profile", protect, authorize("buyer", "admin"), upsertBuyerProfile);

router.get("/dashboard/insights", protect, authorize("buyer", "admin"), dashboardLimiter, getBuyerDashboardInsights);
router.get("/dashboard/price-trends", protect, authorize("buyer", "admin"), dashboardLimiter, validateQuery(dashboardQuerySchema), getBuyerPriceTrends);
router.get("/dashboard/recommendations", protect, authorize("buyer", "admin"), dashboardLimiter, getBuyerRecommendations);
router.get("/dashboard/wallet", protect, authorize("buyer", "admin"), dashboardLimiter, getBuyerWallet);
router.get("/dashboard/orders", protect, authorize("buyer", "admin"), dashboardLimiter, validateQuery(dashboardQuerySchema), getBuyerOrders);
router.get("/dashboard/analytics", protect, authorize("buyer", "admin"), dashboardLimiter, getBuyerAnalytics);

export default router;
