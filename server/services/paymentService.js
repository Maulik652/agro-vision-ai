/**
 * Payment Service — Razorpay + Stripe
 * Handles gateway order creation and signature verification.
 * Escrow: funds held on platform until order = completed.
 */
import crypto from "crypto";
import Razorpay from "razorpay";
import Stripe from "stripe";
import Payment from "../models/Payment.js";
import { markOrdersPaid } from "./orderService.js";

/* ── Gateway clients (lazy init) ─────────────────────────────── */
let razorpay = null;
let stripe   = null;

const getRazorpay = () => {
  const keyId     = process.env.RAZORPAY_KEY_ID     ?? "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? "";
  const isPlaceholder = keyId.includes("xxx") || keySecret.includes("xxx") || !keyId || !keySecret;
  if (isPlaceholder) {
    throw Object.assign(
      new Error("Razorpay is not configured. Add real RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env file."),
      { status: 503 }
    );
  }
  if (!razorpay) {
    razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return razorpay;
};

const getStripe = () => {
  if (!stripe) stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripe;
};

/* ── Wallet ───────────────────────────────────────────────────── */
export const verifyWallet = async (buyerId, parentOrderId) => {
  const walletPaymentId = `WALLET-${Date.now()}`;

  await Payment.create({
    parentOrderId, buyer: buyerId,
    paymentGateway: "wallet",
    gatewayOrderId: walletPaymentId,
    paymentId:      walletPaymentId,
    amount: 0, currency: "INR",
    status: "paid",
  });

  await markOrdersPaid(parentOrderId, walletPaymentId);
  return { verified: true, paymentId: walletPaymentId };
};

/* ── Razorpay ────────────────────────────────────────────────── */
export const createRazorpayOrder = async (buyerId, parentOrderId, amountInRupees) => {
  const rz = getRazorpay();
  const rzOrder = await rz.orders.create({
    amount:   Math.round(amountInRupees * 100), // paise
    currency: "INR",
    receipt:  parentOrderId,
    notes:    { parentOrderId, buyerId: buyerId.toString() },
  });

  await Payment.create({
    parentOrderId, buyer: buyerId,
    paymentGateway: "razorpay",
    gatewayOrderId: rzOrder.id,
    amount: amountInRupees, currency: "INR",
    status: "created",
  });

  return { gatewayOrderId: rzOrder.id, amount: amountInRupees, currency: "INR" };
};

export const verifyRazorpay = async (buyerId, { parentOrderId, razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  const body   = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");

  if (expected !== razorpay_signature) {
    throw Object.assign(new Error("Payment signature verification failed"), { status: 400 });
  }

  await Payment.findOneAndUpdate(
    { parentOrderId, paymentGateway: "razorpay" },
    { $set: { paymentId: razorpay_payment_id, signature: razorpay_signature, status: "paid",
               gatewayResponse: { razorpay_order_id, razorpay_payment_id, razorpay_signature } } }
  );

  await markOrdersPaid(parentOrderId, razorpay_payment_id);
  return { verified: true, paymentId: razorpay_payment_id };
};

/* ── Stripe ──────────────────────────────────────────────────── */
export const createStripeIntent = async (buyerId, parentOrderId, amountInRupees) => {
  const st = getStripe();
  const intent = await st.paymentIntents.create({
    amount:   Math.round(amountInRupees * 100),
    currency: "inr",
    metadata: { parentOrderId, buyerId: buyerId.toString() },
  });

  await Payment.create({
    parentOrderId, buyer: buyerId,
    paymentGateway: "stripe",
    gatewayOrderId: intent.id,
    amount: amountInRupees, currency: "INR",
    status: "created",
  });

  return { clientSecret: intent.client_secret, gatewayOrderId: intent.id, amount: amountInRupees };
};

export const verifyStripe = async (buyerId, { parentOrderId, stripe_payment_intent }) => {
  const st = getStripe();
  const intent = await st.paymentIntents.retrieve(stripe_payment_intent);

  if (intent.status !== "succeeded") {
    throw Object.assign(new Error("Stripe payment not completed"), { status: 400 });
  }

  await Payment.findOneAndUpdate(
    { parentOrderId, paymentGateway: "stripe" },
    { $set: { paymentId: stripe_payment_intent, status: "paid", gatewayResponse: intent } }
  );

  await markOrdersPaid(parentOrderId, stripe_payment_intent);
  return { verified: true, paymentId: stripe_payment_intent };
};

/* ── Razorpay Webhook ────────────────────────────────────────── */
export const handleRazorpayWebhook = async (rawBody, signature) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  if (digest !== signature) throw Object.assign(new Error("Invalid webhook signature"), { status: 400 });

  const event = JSON.parse(rawBody);
  if (event.event === "payment.captured") {
    const { order_id, id: paymentId } = event.payload.payment.entity;
    const payment = await Payment.findOne({ gatewayOrderId: order_id });
    if (payment && payment.status !== "paid") {
      payment.status = "paid"; payment.paymentId = paymentId;
      await payment.save();
      await markOrdersPaid(payment.parentOrderId, paymentId);
    }
  }
};
