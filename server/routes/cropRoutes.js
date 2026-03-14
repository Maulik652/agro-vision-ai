import express from "express";
import { authorize, protect } from "../middleware/authMiddleware.js";
import { createRouteRateLimiter } from "../middleware/rateLimitMiddleware.js";
import {
  validateBody,
  validateParams,
  validateQuery
} from "../middleware/zodValidate.js";
import {
  createCropListing,
  getCrops,
  getFarmerMarketIntelligence,
  getFarmerEarningsDashboard,
  getHighDemandCrops,
  getMarketTrends
} from "../controllers/cropController.js";
import {
  getCropDetailById,
  getCropReviewsById,
  getSimilarCropsById,
  upsertCropReview
} from "../controllers/cropDetailController.js";
import {
  farmerMyListings,
  farmerUpdateListing,
  farmerDeleteListing,
  farmerPauseListing,
  submitOffer,
  farmerOffers,
  listingOffers,
  farmerRespondOffer,
  farmerCreateOrder,
  farmerOrders,
  farmerUpdateOrder,
  farmerSalesAnalytics,
  farmerDiscoverBuyers,
  farmerHarvestInsights,
  farmerDemandIndicators,
} from "../controllers/sellCropController.js";
import {
  cropIdParamSchema,
  cropReviewBodySchema,
  cropReviewsQuerySchema,
  similarCropsQuerySchema
} from "../validation/cropDetailValidation.js";

const router = express.Router();

const cropDetailLimiter = createRouteRateLimiter({
  windowMs: 60_000,
  max: 90,
  message: "Too many crop detail requests. Please retry shortly."
});

router.get("/", protect, authorize("farmer", "buyer", "admin"), getCrops);
router.get("/trends", protect, authorize("farmer", "buyer", "admin"), getMarketTrends);
router.get("/high-demand", protect, authorize("farmer", "buyer", "admin"), getHighDemandCrops);
router.get("/earnings/dashboard", protect, authorize("farmer", "admin"), getFarmerEarningsDashboard);
router.get("/farmer/intelligence", protect, authorize("farmer", "admin"), getFarmerMarketIntelligence);

/* ─── Sell Crop: Farmer Listings ──────────────────────────────────── */
router.get("/my-listings", protect, authorize("farmer", "admin"), farmerMyListings);
router.put("/:id", protect, authorize("farmer", "admin"), farmerUpdateListing);
router.delete("/:id", protect, authorize("farmer", "admin"), farmerDeleteListing);
router.patch("/:id/pause", protect, authorize("farmer", "admin"), farmerPauseListing);

/* ─── Sell Crop: Offers ───────────────────────────────────────────── */
router.get("/offers", protect, authorize("farmer", "admin"), farmerOffers);
router.get("/:id/offers", protect, authorize("farmer", "buyer", "admin"), listingOffers);
router.post("/offers", protect, authorize("buyer", "admin"), submitOffer);
router.patch("/offers/:id/respond", protect, authorize("farmer", "admin"), farmerRespondOffer);

/* ─── Sell Crop: Orders ───────────────────────────────────────────── */
router.get("/orders", protect, authorize("farmer", "admin"), farmerOrders);
router.post("/orders", protect, authorize("farmer", "admin"), farmerCreateOrder);
router.patch("/orders/:id", protect, authorize("farmer", "admin"), farmerUpdateOrder);

/* ─── Sell Crop: Analytics & Discovery ────────────────────────────── */
router.get("/sales/analytics", protect, authorize("farmer", "admin"), farmerSalesAnalytics);
router.get("/discover-buyers", protect, authorize("farmer", "admin"), farmerDiscoverBuyers);
router.get("/harvest-insights", protect, authorize("farmer", "admin"), farmerHarvestInsights);
router.get("/demand-indicators", protect, authorize("farmer", "admin"), farmerDemandIndicators);

/* ─── Crop Detail Module Endpoints ─────────────────────────────────── */
router.get(
  "/:id/reviews",
  protect,
  authorize("farmer", "buyer", "admin"),
  cropDetailLimiter,
  validateParams(cropIdParamSchema),
  validateQuery(cropReviewsQuerySchema),
  getCropReviewsById
);

router.post(
  "/:id/reviews",
  protect,
  authorize("buyer", "admin"),
  cropDetailLimiter,
  validateParams(cropIdParamSchema),
  validateBody(cropReviewBodySchema),
  upsertCropReview
);

router.get(
  "/:id/similar",
  protect,
  authorize("farmer", "buyer", "admin"),
  cropDetailLimiter,
  validateParams(cropIdParamSchema),
  validateQuery(similarCropsQuerySchema),
  getSimilarCropsById
);

router.get(
  "/:id",
  protect,
  authorize("farmer", "buyer", "admin"),
  cropDetailLimiter,
  validateParams(cropIdParamSchema),
  getCropDetailById
);

router.post("/", protect, authorize("farmer", "admin"), createCropListing);

export default router;
