/**
 * Analytics real-time helpers.
 * Emits targeted events to a buyer's personal socket room so the
 * Analytics page auto-refreshes without a page reload.
 *
 * Events emitted:
 *   analytics_order_update  — new order placed / status changed
 *   analytics_wallet_update — wallet balance / transaction changed
 *   analytics_stats_update  — generic signal to re-fetch all stats
 */
import { getSocketServer } from "./socketServer.js";

/**
 * Notify a specific buyer that their analytics data changed.
 * @param {string} buyerId
 * @param {"order"|"wallet"|"stats"} type
 * @param {object} [payload]
 */
export const emitAnalyticsUpdate = (buyerId, type = "stats", payload = {}) => {
  const io = getSocketServer();
  if (!io || !buyerId) return;

  const event = `analytics_${type}_update`;
  io.to(`user:${String(buyerId)}`).emit(event, {
    ...payload,
    emittedAt: new Date().toISOString(),
  });
};
