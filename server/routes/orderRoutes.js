import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { validateBody } from "../middleware/zodValidate.js";
import { createOrderSchema } from "../validation/checkoutValidation.js";
import { checkoutSummary, createOrder, getOrder, getBuyerOrders } from "../controllers/orderController.js";

const router = express.Router();
router.use(protect);
router.use(authorize("buyer", "admin"));

router.get("/checkout-summary",  checkoutSummary);
router.get("/buyer",             getBuyerOrders);
router.get("/:orderId",          getOrder);
router.post("/create",           validateBody(createOrderSchema), createOrder);

export default router;
