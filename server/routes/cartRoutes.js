/**
 * Cart Routes
 * All routes require JWT auth + buyer/admin role.
 */
import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { validateBody, validateParams } from "../middleware/zodValidate.js";
import {
  addToCartSchema,
  updateCartSchema,
  cropIdParamSchema,
} from "../validation/cartValidation.js";
import {
  getCart,
  addToCart,
  updateCart,
  removeFromCart,
  clearCart,
  getDeliveryEstimate,
} from "../controllers/cartController.js";

const router = express.Router();

// All cart routes require authentication
router.use(protect, authorize("buyer", "admin"));

router.get("/",                                                    getCart);
router.post("/add",          validateBody(addToCartSchema),        addToCart);
router.put("/update/:cropId",
  validateParams(cropIdParamSchema),
  validateBody(updateCartSchema),
  updateCart
);
router.delete("/remove/:cropId", validateParams(cropIdParamSchema), removeFromCart);
router.delete("/clear",                                            clearCart);
router.get("/delivery-estimate",                                   getDeliveryEstimate);

// Legacy compat — keep old DELETE /item/:cropId working
router.delete("/item/:cropId", validateParams(cropIdParamSchema),  removeFromCart);

export default router;
