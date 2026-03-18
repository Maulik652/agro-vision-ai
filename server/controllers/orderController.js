import { getCache, setCache, deleteCache } from "../config/redis.js";
import * as svc from "../services/orderService.js";
import { emitAnalyticsUpdate } from "../realtime/analyticsNamespace.js";
import { emitAdminActivity } from "../realtime/adminNamespace.js";

const err = (res, e) => res.status(e.status ?? 500).json({ success: false, message: e.message });

/** GET /api/orders/checkout-summary?deliveryType=standard */
export const checkoutSummary = async (req, res) => {
  try {
    const buyerId      = req.user._id.toString();
    const deliveryType = req.query.deliveryType ?? "standard";
    const cacheKey     = `checkout_summary_${buyerId}_${deliveryType}`;

    const cached = await getCache(cacheKey);
    if (cached) return res.json({ success: true, data: cached, cached: true });

    const data = await svc.buildCheckoutSummary(buyerId, deliveryType);
    await setCache(cacheKey, data, 120);
    res.json({ success: true, data });
  } catch (e) { err(res, e); }
};

/** POST /api/orders/create */
export const createOrder = async (req, res) => {
  try {
    const buyerId = req.user._id.toString();
    const data    = await svc.createOrdersFromCart(buyerId, req.validatedBody);
    // Invalidate buyer orders cache so the new order appears immediately
    await deleteCache(`buyer_orders_${buyerId}`);
    // Invalidate analytics cache so stats update in real-time
    await deleteCache(`analytics_buyer_${buyerId}_30d_all`);
    // Notify analytics page via socket
    emitAnalyticsUpdate(buyerId, "order", { orderId: data.parentOrderId, totalAmount: data.grandTotal });
    // Push to admin live activity feed
    emitAdminActivity({ type: "order", message: `New order #${String(data.parentOrderId).slice(-6)}`, time: new Date().toISOString() });
    res.status(201).json({ success: true, data });
  } catch (e) { err(res, e); }
};

/** GET /api/orders/:orderId */
export const getOrder = async (req, res) => {
  try {
    const data = await svc.getOrderById(req.params.orderId, req.user._id.toString());
    res.json({ success: true, data });
  } catch (e) { err(res, e); }
};

/**
 * GET /api/orders/buyer
 * Redis cached for 120s — key: buyer_orders_<buyerId>
 */
export const getBuyerOrders = async (req, res) => {
  try {
    const buyerId  = req.user._id.toString();
    const cacheKey = `buyer_orders_${buyerId}`;

    const cached = await getCache(cacheKey);
    if (cached) return res.json({ success: true, data: cached, cached: true });

    const data = await svc.getBuyerOrders(buyerId);
    await setCache(cacheKey, data, 120);
    res.json({ success: true, data });
  } catch (e) { err(res, e); }
};
