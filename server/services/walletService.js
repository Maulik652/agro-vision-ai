/**
 * Wallet Service — AgroVision AI
 *
 * Architecture decisions:
 * - All balance mutations use MongoDB $inc with findOneAndUpdate (atomic).
 * - Every mutation writes an immutable WalletTransaction record.
 * - Redis caches wallet balance (TTL 300s); invalidated on every mutation.
 * - Razorpay/Stripe topup flow: create gateway order → verify → credit wallet.
 * - Wallet pay: debit wallet atomically, fail if insufficient balance.
 * - Refund: credit wallet from system (no gateway needed).
 */
import crypto from "crypto";
import Razorpay from "razorpay";
import Stripe from "stripe";
import Wallet from "../models/Wallet.js";
import WalletTransaction from "../models/WalletTransaction.js";
import { getCache, setCache, deleteCache } from "../config/redis.js";

const BALANCE_TTL = 300; // 5 min
const balanceKey  = (userId) => `wallet_balance_${userId}`;

/* ── Gateway clients (lazy) ──────────────────────────────────── */
let _razorpay = null;
let _stripe   = null;

const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw Object.assign(new Error("Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env"), { status: 400 });
  }
  if (!_razorpay) _razorpay = new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  return _razorpay;
};

const getStripe = () => {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
};

/* ── Ensure wallet exists for user ───────────────────────────── */
export const ensureWallet = async (userId) => {
  return Wallet.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId, balance: 0 } },
    { upsert: true, new: true }
  );
};

/* ── GET wallet + balance ─────────────────────────────────────── */
export const getWallet = async (userId) => {
  const cached = await getCache(balanceKey(userId));
  if (cached !== null) return cached;

  const wallet = await ensureWallet(userId);
  const data   = { balance: wallet.balance, currency: "INR" };
  await setCache(balanceKey(userId), data, BALANCE_TTL);
  return data;
};

/* ── Invalidate balance cache ────────────────────────────────── */
const invalidate = (userId) => deleteCache(balanceKey(userId));

/* ── Create Razorpay topup order ─────────────────────────────── */
export const createRazorpayTopup = async (userId, amount) => {
  const referenceId = `TOPUP-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const rz = getRazorpay();
  const order = await rz.orders.create({
    amount:   Math.round(amount * 100),
    currency: "INR",
    receipt:  referenceId,
    notes:    { userId: userId.toString(), type: "wallet_topup" },
  });
  return { gatewayOrderId: order.id, referenceId, amount, currency: "INR" };
};

/* ── Create Stripe topup intent ──────────────────────────────── */
export const createStripeTopup = async (userId, amount) => {
  const referenceId = `TOPUP-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const st = getStripe();
  const intent = await st.paymentIntents.create({
    amount:   Math.round(amount * 100),
    currency: "inr",
    metadata: { userId: userId.toString(), type: "wallet_topup", referenceId },
  });
  return { clientSecret: intent.client_secret, gatewayOrderId: intent.id, referenceId, amount };
};

/* ── Verify Razorpay topup + credit wallet ───────────────────── */
export const verifyRazorpayTopup = async (userId, body) => {
  const { referenceId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expected !== razorpay_signature) {
    throw Object.assign(new Error("Signature verification failed"), { status: 400 });
  }

  // Idempotency: skip if already credited
  const exists = await WalletTransaction.findOne({ referenceId, user: userId, category: "topup" });
  if (exists) return { balance: (await getWallet(userId)).balance };

  // Fetch amount from Razorpay
  const rz      = getRazorpay();
  const payment = await rz.payments.fetch(razorpay_payment_id);
  const amount  = payment.amount / 100;

  return _creditWallet(userId, amount, "topup", "razorpay", referenceId, "Wallet top-up via Razorpay");
};

/* ── Verify Stripe topup + credit wallet ─────────────────────── */
export const verifyStripeTopup = async (userId, body) => {
  const { referenceId, stripe_payment_intent } = body;

  const st     = getStripe();
  const intent = await st.paymentIntents.retrieve(stripe_payment_intent);
  if (intent.status !== "succeeded") {
    throw Object.assign(new Error("Stripe payment not completed"), { status: 400 });
  }

  const exists = await WalletTransaction.findOne({ referenceId, user: userId, category: "topup" });
  if (exists) return { balance: (await getWallet(userId)).balance };

  const amount = intent.amount / 100;
  return _creditWallet(userId, amount, "topup", "stripe", referenceId, "Wallet top-up via Stripe");
};

/* ── Debit wallet for order payment ──────────────────────────── */
export const walletPay = async (userId, { amount, referenceId, description }) => {
  const wallet = await ensureWallet(userId);
  if (wallet.balance < amount) {
    throw Object.assign(new Error("Insufficient wallet balance"), { status: 400 });
  }

  const updated = await Wallet.findOneAndUpdate(
    { user: userId, balance: { $gte: amount } },
    { $inc: { balance: -amount } },
    { new: true }
  );
  if (!updated) throw Object.assign(new Error("Insufficient wallet balance"), { status: 400 });

  await WalletTransaction.create({
    user: userId, type: "debit", category: "order_payment",
    amount, balanceAfter: updated.balance,
    status: "completed", paymentGateway: "wallet",
    referenceId, description: description ?? "Order payment via wallet",
  });

  await invalidate(userId);
  return { balance: updated.balance };
};

/* ── Credit wallet for refund ────────────────────────────────── */
export const refundToWallet = async (userId, { amount, referenceId, description }) => {
  return _creditWallet(userId, amount, "refund", "system", referenceId, description ?? "Order refund");
};

/* ── Internal: credit wallet atomically ─────────────────────── */
const _creditWallet = async (userId, amount, category, gateway, referenceId, description) => {
  const updated = await Wallet.findOneAndUpdate(
    { user: userId },
    { $inc: { balance: amount } },
    { new: true, upsert: true }
  );

  await WalletTransaction.create({
    user: userId, type: "credit", category,
    amount, balanceAfter: updated.balance,
    status: "completed", paymentGateway: gateway,
    referenceId, description,
  });

  await invalidate(userId);
  return { balance: updated.balance };
};

/* ── Get paginated transactions ──────────────────────────────── */
export const getTransactions = async (userId, { page = 1, limit = 20, category = "all" }) => {
  const filter = { user: userId };
  if (category !== "all") filter.category = category;

  const skip = (page - 1) * limit;
  const [transactions, total] = await Promise.all([
    WalletTransaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    WalletTransaction.countDocuments(filter),
  ]);

  return {
    transactions,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};
