import express from "express";
import { authorize, protect } from "../middleware/authMiddleware.js";
import { getMarketPrices } from "../controllers/dashboardDataController.js";

const router = express.Router();

router.use(protect, authorize("farmer", "buyer", "admin"));
router.get("/prices", getMarketPrices);

export default router;
