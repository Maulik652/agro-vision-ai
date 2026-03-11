import express from "express";
import { authorize, protect } from "../middleware/authMiddleware.js";
import { getSoilData } from "../controllers/dashboardDataController.js";

const router = express.Router();

router.use(protect, authorize("farmer", "admin"));
router.get("/data", getSoilData);

export default router;
