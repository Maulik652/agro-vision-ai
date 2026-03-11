import express from "express";
import { authorize, protect } from "../middleware/authMiddleware.js";
import {
  getCurrentWeather,
  getWeatherDecisionAnalysis,
  getWeatherForecast
} from "../controllers/weatherController.js";

const router = express.Router();

router.use(protect, authorize("farmer"));
router.get("/current", getCurrentWeather);
router.get("/forecast", getWeatherForecast);
router.get("/analysis", getWeatherDecisionAnalysis);

export default router;
