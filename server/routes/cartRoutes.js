import express from "express";
import { authorize, protect } from "../middleware/authMiddleware.js";
import { createRouteRateLimiter } from "../middleware/rateLimitMiddleware.js";
import { validateBody, validateQuery } from "../middleware/zodValidate.js";
import {
  addCartItem,
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem
} from "../controllers/cartController.js";
import {
  cartAddBodySchema,
  cartClearQuerySchema,
  cartGetQuerySchema,
  cartRemoveBodySchema,
  cartUpdateBodySchema
} from "../validation/cartValidation.js";

const router = express.Router();

const limiter = createRouteRateLimiter({
  windowMs: 60_000,
  max: 60,
  message: "Too many cart updates. Please retry shortly."
});

router.use(protect, authorize("buyer", "admin"));

router.get(
  "/",
  validateQuery(cartGetQuerySchema),
  getCart
);

router.post(
  "/add",
  limiter,
  validateBody(cartAddBodySchema),
  addCartItem
);

router.put(
  "/update",
  limiter,
  validateBody(cartUpdateBodySchema),
  updateCartItem
);

router.delete(
  "/remove",
  limiter,
  validateBody(cartRemoveBodySchema),
  removeCartItem
);

router.delete(
  "/clear",
  limiter,
  validateQuery(cartClearQuerySchema),
  clearCart
);

export default router;
