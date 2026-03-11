import express from "express";
import { authorize, protect } from "../middleware/authMiddleware.js";
import { getMarketPrices } from "../controllers/dashboardDataController.js";
import {
  marketIntelPrices,
  marketIntelTrends,
  marketIntelPredict,
  marketIntelInsights,
  marketIntelProfitability,
  marketIntelNearbyMarkets,
  marketIntelDemandHeatmap
} from "../controllers/marketIntelligenceController.js";

const router = express.Router();

router.use(protect, authorize("farmer", "buyer", "admin"));
router.get("/prices", getMarketPrices);

/* Market Intelligence endpoints */
router.get("/intel/prices", marketIntelPrices);
router.get("/intel/trends", marketIntelTrends);
router.get("/intel/predict", marketIntelPredict);
router.get("/intel/insights", marketIntelInsights);
router.get("/intel/profitability", marketIntelProfitability);
router.get("/intel/nearby", marketIntelNearbyMarkets);
router.get("/intel/heatmap", marketIntelDemandHeatmap);

export default router;
