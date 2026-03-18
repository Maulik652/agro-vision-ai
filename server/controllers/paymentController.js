import * as svc from "../services/paymentService.js";
import { getCache, setCache } from "../config/redis.js";
import Order from "../models/Order.js";
import { emitAdminActivity } from "../realtime/adminNamespace.js";

const err = (res, e) => res.status(e.status ?? 500).json({ success: false, message: e.message });

/**
 * GET /api/payments/summary/:parentOrderId
 * Returns all sub-orders under a parentOrderId with full pricing.
 * Redis cached for 120s — key: payment_summary_<parentOrderId>
 */
export const getPaymentSummary = async (req, res) => {
  try {
    const { parentOrderId } = req.params;
    const buyerId = req.user._id.toString();
    const cacheKey = `payment_summary_${parentOrderId}`;

    const cached = await getCache(cacheKey);
    if (cached) return res.json({ success: true, data: cached, cached: true });

    const orders = await Order.find({ parentOrderId, buyer: buyerId })
      .populate("farmer", "name phone")
      .lean();

    if (!orders.length) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Aggregate totals across all sub-orders
    const totals = orders.reduce(
      (acc, o) => ({
        subtotal:    +(acc.subtotal    + o.subtotal).toFixed(2),
        deliveryCost:+(acc.deliveryCost+ o.deliveryCost).toFixed(2),
        serviceFee:  +(acc.serviceFee  + o.serviceFee).toFixed(2),
        tax:         +(acc.tax         + o.tax).toFixed(2),
        grandTotal:  +(acc.grandTotal  + o.totalAmount).toFixed(2),
      }),
      { subtotal: 0, deliveryCost: 0, serviceFee: 0, tax: 0, grandTotal: 0 }
    );

    const data = {
      parentOrderId,
      orders,
      totals,
      deliveryAddress: orders[0]?.deliveryAddress ?? null,
      deliveryType:    orders[0]?.deliveryType ?? "standard",
      paymentStatus:   orders[0]?.paymentStatus ?? "pending_payment",
      estimatedDelivery: orders[0]?.estimatedDelivery ?? null,
    };

    await setCache(cacheKey, data, 120);
    res.json({ success: true, data });
  } catch (e) { err(res, e); }
};

/** POST /api/payments/create-order */
export const createPaymentOrder = async (req, res) => {
  try {
    const { parentOrderId, gateway, grandTotal } = req.validatedBody ?? req.body;
    const buyerId = req.user._id.toString();

    let data;
    if (gateway === "razorpay") {
      data = await svc.createRazorpayOrder(buyerId, parentOrderId, grandTotal);
    } else if (gateway === "stripe") {
      data = await svc.createStripeIntent(buyerId, parentOrderId, grandTotal);
    } else {
      return res.status(400).json({ success: false, message: "Unsupported gateway" });
    }

    res.status(201).json({ success: true, data });
  } catch (e) {
    const status = e.status ?? 500;
    console.error("[PaymentController] create-order error:", e.message);
    res.status(status).json({ success: false, message: e.message });
  }
};

/** POST /api/payments/verify */
export const verifyPayment = async (req, res) => {
  try {
    const buyerId = req.user._id.toString();
    const body    = req.validatedBody ?? req.body;

    let data;
    if (body.wallet === true) {
      data = await svc.verifyWallet(buyerId, body.parentOrderId);
    } else if (body.razorpay_payment_id) {
      data = await svc.verifyRazorpay(buyerId, body);
    } else if (body.stripe_payment_intent) {
      data = await svc.verifyStripe(buyerId, body);
    } else {
      return res.status(400).json({ success: false, message: "Missing payment data" });
    }

    // Notify admin live activity feed on successful payment
    const amount = body.amount ?? data?.amount;
    if (amount) {
      emitAdminActivity({ type: "payment", message: `Payment ₹${amount} received`, time: new Date().toISOString() });
    }

    res.json({ success: true, data });
  } catch (e) { err(res, e); }
};

/** POST /api/payments/webhook — Razorpay webhook (no auth) */
export const razorpayWebhook = async (req, res) => {
  try {
    const sig = req.headers["x-razorpay-signature"];
    await svc.handleRazorpayWebhook(req.rawBody ?? JSON.stringify(req.body), sig);
    res.json({ received: true });
  } catch (e) { err(res, e); }
};
