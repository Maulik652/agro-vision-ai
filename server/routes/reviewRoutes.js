import { Router } from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import {
  getOverview, getFeed, getById, createReview, reportReview,
  moderateReview, getAnalytics, getQualityReviews, createQualityReview,
  getModerationQueue, analyzeSentiment, detectSpam
} from "../controllers/reviewController.js";

const router = Router();

/* ── Public / any authenticated user ── */
router.use(protect);

router.get("/overview",          getOverview);
router.get("/analytics",         getAnalytics);
router.get("/",                  getFeed);
router.get("/:id",               getById);
router.post("/",                 authorize("farmer", "buyer", "expert", "admin"), createReview);
router.post("/:id/report",       reportReview);

/* ── AI endpoints ── */
router.post("/ai/sentiment",     analyzeSentiment);
router.post("/ai/spam",          detectSpam);

/* ── Expert / Admin only ── */
router.patch("/:id/status",      authorize("expert", "admin"), moderateReview);
router.get("/quality/list",      authorize("expert", "admin"), getQualityReviews);
router.post("/quality",          authorize("expert", "admin"), createQualityReview);
router.get("/moderation/queue",  authorize("expert", "admin"), getModerationQueue);

export default router;
