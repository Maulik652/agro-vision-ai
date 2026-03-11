import express from "express";
import { authorize, protect } from "../middleware/authMiddleware.js";
import {
  scanAnalyze,
  scanCropDoctor,
  scanCrop,
  scanDisease,
  scanHistory,
  scanHealthScore,
  scanModules,
  scanNutrient,
  scanPest,
  scanReport
} from "../controllers/scanController.js";

const router = express.Router();

router.use(protect, authorize("farmer"));

router.get("/modules", scanModules);

router.post("/crop", scanCrop);
router.post("/disease", scanDisease);
router.post("/pest", scanPest);
router.post("/nutrient", scanNutrient);
router.post("/health-score", scanHealthScore);

router.post("/analyze", scanAnalyze);
router.post("/report", scanReport);
router.get("/history", scanHistory);
router.post("/crop-doctor", scanCropDoctor);

export default router;
