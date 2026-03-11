import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import {
  exportPredictionReport,
  listPredictionModules,
  predictAllModules,
  predictClimateRisk,
  predictCropHealthRisk,
  predictCropRecommendation,
  predictFarmHealth,
  predictIrrigation,
  predictMarket,
  predictPest,
  predictProfit,
  predictWeatherRisk,
  predictYield
} from "../controllers/predictController.js";

const router = express.Router();

router.use(protect, authorize("farmer"));

router.get("/modules", listPredictionModules);

router.post("/crop-health-risk", predictCropHealthRisk);
router.post("/yield", predictYield);
router.post("/irrigation", predictIrrigation);
router.post("/pest", predictPest);
router.post("/market", predictMarket);
router.post("/profit", predictProfit);
router.post("/crop", predictCropRecommendation);
router.post("/weather", predictWeatherRisk);
router.post("/farm-health", predictFarmHealth);
router.post("/climate-risk", predictClimateRisk);

router.post("/all", predictAllModules);
router.post("/report", exportPredictionReport);

export default router;
