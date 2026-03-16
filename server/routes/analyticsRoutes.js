import { Router } from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import {
  getBuyerAnalytics,
  getAIInsights,
  getAIPredictions,
} from "../controllers/analyticsController.js";

const router = Router();

router.use(protect, authorize("buyer", "admin"));

router.get("/buyer",          getBuyerAnalytics);
router.get("/ai-insights",    getAIInsights);
router.get("/ai-predictions", getAIPredictions);

export default router;
