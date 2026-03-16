import express from "express";
import { authorize, protect } from "../middleware/authMiddleware.js";
import { createRouteRateLimiter } from "../middleware/rateLimitMiddleware.js";
import { validateParams } from "../middleware/zodValidate.js";
import {
  aiDemandPrediction,
  aiLogisticsEstimate,
  aiPriceSuggestion,
  aiQualityCheck,
  aiSellAssistant,
  aiPriceNegotiation
} from "../controllers/marketAIController.js";
import {
  aiFertilizerRecommendation as aiFertilizerFromPredict,
  aiIrrigationRecommendation as aiIrrigationFromPredict,
  aiPestRisk as aiPestRiskFromPredict,
  aiYieldPrediction as aiYieldFromPredict
} from "../controllers/aiPredictionController.js";
import {
  aiCropScan,
  aiScanHistory,
  uploadMiddleware,
} from "../controllers/cropScanController.js";
import { getAICropInsightsByCropId } from "../controllers/aiCropInsightsController.js";
import { aiCropInsightsParamSchema } from "../validation/cropDetailValidation.js";

const router = express.Router();

const limiter = createRouteRateLimiter({
  windowMs: 60_000,
  max: 100,
  message: "Too many AI requests. Please retry shortly."
});

router.get(
  "/crop-insights/:cropId",
  protect,
  authorize("buyer", "farmer", "admin"),
  limiter,
  validateParams(aiCropInsightsParamSchema),
  getAICropInsightsByCropId
);

router.post("/price",    protect, authorize("farmer", "buyer", "admin"), aiPriceSuggestion);
router.post("/demand",   protect, authorize("farmer", "buyer", "admin"), aiDemandPrediction);
router.post("/quality",  protect, authorize("farmer", "buyer", "admin"), aiQualityCheck);
router.post("/logistics",protect, authorize("farmer", "buyer", "admin"), aiLogisticsEstimate);
router.post("/sell-assistant",protect, authorize("farmer", "buyer", "admin"), aiSellAssistant);
router.post("/price-negotiation", protect, authorize("buyer", "farmer", "admin"), aiPriceNegotiation);

/* Dashboard AI prediction endpoints */
router.post("/yield-prediction", protect, authorize("farmer", "admin"), aiYieldFromPredict);
router.post("/pest-risk",        protect, authorize("farmer", "admin"), aiPestRiskFromPredict);
router.post("/irrigation",       protect, authorize("farmer", "admin"), aiIrrigationFromPredict);
router.post("/fertilizer",       protect, authorize("farmer", "admin"), aiFertilizerFromPredict);

/* Crop disease scan endpoints (farmer only) */
router.post("/crop-scan",    protect, authorize("farmer"), uploadMiddleware, aiCropScan);
router.get("/scan-history",  protect, authorize("farmer"), aiScanHistory);

export default router;
