import * as svc from "../services/earningsService.js";

const ok  = (res, data) => res.json({ success: true, data });
const err = (res, e, msg = "Server error") => {
  console.error(msg, e);
  res.status(e.status || 500).json({ success: false, message: e.message || msg });
};

const q = (req) => req.query;

export const getOverview       = async (req, res) => { try { ok(res, await svc.fetchOverview(q(req)));       } catch (e) { err(res, e); } };
export const getTrends         = async (req, res) => { try { ok(res, await svc.fetchTrends(q(req)));         } catch (e) { err(res, e); } };
export const getTransactions   = async (req, res) => { try { ok(res, await svc.fetchTransactions(q(req)));   } catch (e) { err(res, e); } };
export const getCommission     = async (req, res) => { try { ok(res, await svc.fetchCommission(q(req)));     } catch (e) { err(res, e); } };
export const getPayouts        = async (req, res) => { try { ok(res, await svc.fetchPayouts(q(req)));        } catch (e) { err(res, e); } };
export const getPaymentStatus  = async (req, res) => { try { ok(res, await svc.fetchPaymentStatus(q(req))); } catch (e) { err(res, e); } };
export const getForecast       = async (req, res) => { try { ok(res, await svc.fetchForecast());             } catch (e) { err(res, e); } };

export const releasePayout = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId) return res.status(400).json({ success: false, message: "orderId required" });
    ok(res, await svc.releasePayout(orderId));
  } catch (e) { err(res, e); }
};

export const exportReport = async (req, res) => {
  try {
    const { filters = {}, format = "json" } = req.body;
    const [overview, trends, commission] = await Promise.all([
      svc.fetchOverview(filters),
      svc.fetchTrends(filters),
      svc.fetchCommission(filters)
    ]);
    ok(res, { format, generatedAt: new Date(), overview, trends, commission, message: `Earnings report generated in ${format} format` });
  } catch (e) { err(res, e); }
};
