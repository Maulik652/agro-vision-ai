import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { validateBody } from "../middleware/zodValidate.js";
import { verifyPaymentSchema } from "../validation/checkoutValidation.js";
import { createPaymentOrder, verifyPayment, razorpayWebhook, getPaymentSummary } from "../controllers/paymentController.js";

const router = express.Router();

// Webhook — no auth, raw body needed for signature verification
router.post("/webhook", express.raw({ type: "application/json" }), razorpayWebhook);

// Protected routes
router.use(protect);
router.use(authorize("buyer", "admin"));

router.get("/summary/:parentOrderId", getPaymentSummary);
router.post("/create-order", createPaymentOrder);
router.post("/verify",       validateBody(verifyPaymentSchema), verifyPayment);

export default router;
