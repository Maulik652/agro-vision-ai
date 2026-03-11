import express from "express";
import { authorize, protect } from "../middleware/authMiddleware.js";
import {
  getMyBuyerProfile,
  getNearbyBuyers,
  getSmartBuyerAlerts,
  upsertBuyerProfile
} from "../controllers/buyerController.js";

const router = express.Router();

router.get("/", protect, authorize("farmer", "buyer", "admin"), getNearbyBuyers);
router.get("/alerts", protect, authorize("farmer", "buyer", "admin"), getSmartBuyerAlerts);
router.get("/me", protect, authorize("buyer", "admin"), getMyBuyerProfile);
router.post("/profile", protect, authorize("buyer", "admin"), upsertBuyerProfile);

export default router;
