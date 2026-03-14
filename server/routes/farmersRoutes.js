import express from "express";
import { authorize, protect } from "../middleware/authMiddleware.js";
import { createRouteRateLimiter } from "../middleware/rateLimitMiddleware.js";
import { validateParams } from "../middleware/zodValidate.js";
import { getFarmerById } from "../controllers/farmersController.js";
import { farmerIdParamSchema } from "../validation/cropDetailValidation.js";

const router = express.Router();

const limiter = createRouteRateLimiter({
  windowMs: 60_000,
  max: 90,
  message: "Too many farmer profile requests. Please retry shortly."
});

router.get(
  "/:id",
  protect,
  authorize("buyer", "farmer", "admin"),
  limiter,
  validateParams(farmerIdParamSchema),
  getFarmerById
);

export default router;
