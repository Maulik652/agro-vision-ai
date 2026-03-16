/**
 * Cart Controller — Thin layer, delegates to cartService
 * All business logic lives in services/cartService.js
 */
import {
  getCartService,
  addItemService,
  updateItemService,
  removeItemService,
  clearCartService,
} from "../services/cartService.js";
import { estimateCartDelivery } from "../services/deliveryService.js";

/* ── Centralized error responder ─────────────────────────────── */
const handleError = (res, err) => {
  const status = err.status ?? 500;
  console.error("[CartController] Error:", err.message, "\nStack:", err.stack);
  return res.status(status).json({ success: false, message: err.message ?? "Server error" });
};

/* ── GET /api/cart ───────────────────────────────────────────── */
export const getCart = async (req, res) => {
  try {
    const data = await getCartService(req.user._id.toString());
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
};

/* ── POST /api/cart/add ──────────────────────────────────────── */
export const addToCart = async (req, res) => {
  try {
    const { cropId, quantity } = req.validatedBody ?? req.body;
    const data = await addItemService(req.user._id.toString(), { cropId, quantity: Number(quantity) });
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
};

/* ── PUT /api/cart/update/:cropId ────────────────────────────── */
export const updateCart = async (req, res) => {
  try {
    const cropId   = req.validatedParams?.cropId ?? req.params.cropId;
    const quantity = req.validatedBody?.quantity  ?? req.body.quantity;
    const data = await updateItemService(req.user._id.toString(), cropId, Number(quantity));
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
};

/* ── DELETE /api/cart/remove/:cropId ─────────────────────────── */
export const removeFromCart = async (req, res) => {
  try {
    const cropId = req.validatedParams?.cropId ?? req.params.cropId;
    const data = await removeItemService(req.user._id.toString(), cropId);
    return res.json({ success: true, data });
  } catch (err) {
    return handleError(res, err);
  }
};

/* ── DELETE /api/cart/clear ──────────────────────────────────── */
export const clearCart = async (req, res) => {
  try {
    const data = await clearCartService(req.user._id.toString());
    return res.json({ success: true, message: "Cart cleared", data });
  } catch (err) {
    return handleError(res, err);
  }
};

/* ── GET /api/cart/delivery-estimate ────────────────────────── */
export const getDeliveryEstimate = async (req, res) => {
  try {
    const cart = await getCartService(req.user._id.toString());
    const buyerState = req.query.buyerState ?? req.user.state ?? "";
    const estimate = estimateCartDelivery(cart.items, buyerState);
    return res.json({ success: true, data: estimate });
  } catch (err) {
    return handleError(res, err);
  }
};
