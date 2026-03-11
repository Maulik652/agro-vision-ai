import express from "express";
import { authorize, protect } from "../middleware/authMiddleware.js";
import { getFarmProfile } from "../controllers/dashboardDataController.js";

const router = express.Router();

router.use(protect, authorize("farmer", "admin"));
router.get("/profile", getFarmProfile);

export default router;
