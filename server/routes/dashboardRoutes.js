import express from "express";
import { authorize, protect } from "../middleware/authMiddleware.js";
import { createRouteRateLimiter } from "../middleware/rateLimitMiddleware.js";
import {
  getDashboardAIInsights,
  getDashboardFavoriteCrops,
  getDashboardOverview,
  getDashboardPriceTrends,
  getDashboardRecentOrders,
  getDashboardRecommendations,
  getDashboardSpending,
  getDashboardTopFarmers
} from "../controllers/dashboardController.js";
import { validateQuery } from "../middleware/zodValidate.js";
import {
  dashboardFavoriteCropsQuerySchema,
  dashboardPriceTrendsQuerySchema,
  dashboardRecentOrdersQuerySchema,
  dashboardRecommendationsQuerySchema,
  dashboardTopFarmersQuerySchema
} from "../validation/buyerDashboardValidation.js";

const router = express.Router();

const dashboardLimiter = createRouteRateLimiter({
  windowMs: 60_000,
  max: 100,
  message: "Too many dashboard requests. Please retry shortly."
});

router.use(protect, authorize("buyer", "admin"), dashboardLimiter);

router.get("/overview", getDashboardOverview);
router.get("/price-trends", validateQuery(dashboardPriceTrendsQuerySchema), getDashboardPriceTrends);
router.get("/recommendations", validateQuery(dashboardRecommendationsQuerySchema), getDashboardRecommendations);
router.get("/recent-orders", validateQuery(dashboardRecentOrdersQuerySchema), getDashboardRecentOrders);
router.get("/spending", getDashboardSpending);
router.get("/top-farmers", validateQuery(dashboardTopFarmersQuerySchema), getDashboardTopFarmers);
router.get("/ai-insights", getDashboardAIInsights);
router.get("/favorite-crops", validateQuery(dashboardFavoriteCropsQuerySchema), getDashboardFavoriteCrops);

export default router;