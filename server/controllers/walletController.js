/**
 * Wallet Controller — AgroVision AI
 * Thin REST layer over walletService.
 */
import * as svc from "../services/walletService.js";
import { emitAnalyticsUpdate } from "../realtime/analyticsNamespace.js";

const err = (res, e) => res.status(e.status ?? 500).json({ success: false, message: e.message });

/** GET /api/wallet — fetch balance (Redis cached) */
export const getWallet = async (req, res) => {
  try {
    const data = await svc.getWallet(req.user._id.toString());
    res.json({ success: true, data });
  } catch (e) { err(res, e); }
};

/** GET /api/wallet/transactions */
export const getTransactions = async (req, res) => {
  try {
    const { page, limit, category } = req.validatedQuery ?? {};
    const data = await svc.getTransactions(req.user._id.toString(), { page, limit, category });
    res.json({ success: true, data });
  } catch (e) { err(res, e); }
};

/** POST /api/wallet/add-money — create gateway order for topup */
export const addMoney = async (req, res) => {
  try {
    const { amount, gateway } = req.validatedBody;
    const userId = req.user._id.toString();
    let data;
    if (gateway === "razorpay") data = await svc.createRazorpayTopup(userId, amount);
    else                        data = await svc.createStripeTopup(userId, amount);
    res.status(201).json({ success: true, data });
  } catch (e) { err(res, e); }
};

/** POST /api/wallet/verify-topup — verify gateway payment and credit wallet */
export const verifyTopup = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const body   = req.validatedBody;
    let data;
    if (body.gateway === "razorpay") data = await svc.verifyRazorpayTopup(userId, body);
    else                             data = await svc.verifyStripeTopup(userId, body);
    // Notify analytics page — wallet balance changed
    emitAnalyticsUpdate(userId, "wallet", { newBalance: data?.balance });
    res.json({ success: true, data });
  } catch (e) { err(res, e); }
};

/** POST /api/wallet/pay — debit wallet for an order */
export const walletPay = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const data   = await svc.walletPay(userId, req.validatedBody);
    emitAnalyticsUpdate(userId, "wallet", { newBalance: data?.balance });
    res.json({ success: true, data });
  } catch (e) { err(res, e); }
};

/**
 * POST /api/wallet/refund
 * Internal endpoint — called by order cancellation flow.
 * Requires admin or system-level access.
 */
export const refund = async (req, res) => {
  try {
    const { userId, amount, referenceId, description } = req.validatedBody;
    const data = await svc.refundToWallet(userId, { amount, referenceId, description });
    res.json({ success: true, data });
  } catch (e) { err(res, e); }
};
