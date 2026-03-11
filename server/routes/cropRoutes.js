import express from "express";
import { authorize, protect } from "../middleware/authMiddleware.js";
import {
  createCropListing,
  getCropDetail,
  getCrops,
  getFarmerEarningsDashboard,
  getHighDemandCrops,
  getMarketTrends
} from "../controllers/cropController.js";

const router = express.Router();

router.get("/", protect, authorize("farmer", "buyer", "admin"), getCrops);
router.get("/trends", protect, authorize("farmer", "buyer", "admin"), getMarketTrends);
router.get("/high-demand", protect, authorize("farmer", "buyer", "admin"), getHighDemandCrops);
router.get("/earnings/dashboard", protect, authorize("farmer", "admin"), getFarmerEarningsDashboard);
router.get("/:id", protect, authorize("farmer", "buyer", "admin"), getCropDetail);
router.post("/", protect, authorize("farmer", "admin"), createCropListing);

export default router;
