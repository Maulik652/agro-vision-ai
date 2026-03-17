/**
 * Earnings Service
 * Aggregates revenue from TWO sources:
 *   1. Payment model  — marketplace order payments (Razorpay / Stripe)
 *   2. Consultation model — advisory/consultation fees paid by farmers & buyers
 */
import Payment      from "../models/Payment.js";
import Consultation from "../models/Consultation.js";
import Order        from "../models/Order.js";
import { getOrSetCache } from "../config/redis.js";

const TTL             = 120;
const COMMISSION_RATE = 0.05; // 5% on marketplace orders

const buildDateMatch = (from, to) => {
  if (!from && !to) return {};
  const r = {};
  if (from) r.$gte = new Date(from);
  if (to)   r.$lte = new Date(to);
  return { createdAt: r };
};

/* ── 1. Overview KPIs ── */
export const fetchOverview = (filters = {}) =>
  getOrSetCache(`earnings_overview_${JSON.stringify(filters)}`, TTL, async () => {
    const dateMatch = buildDateMatch(filters.from, filters.to);

    const [orderPaid, orderPending, orderRefunded, orderFailed, consultPaid, consultPending] = await Promise.all([
      // Marketplace order payments
      Payment.aggregate([
        { $match: { status: "paid", ...dateMatch } },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
      ]),
      Payment.aggregate([
        { $match: { status: "created", ...dateMatch } },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
      ]),
      Payment.aggregate([
        { $match: { status: "refunded", ...dateMatch } },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
      ]),
      Payment.aggregate([
        { $match: { status: "failed", ...dateMatch } },
        { $group: { _id: null, count: { $sum: 1 } } }
      ]),
      // Consultation / advisory payments
      Consultation.aggregate([
        { $match: { paymentStatus: "paid", consultationFee: { $gt: 0 }, ...dateMatch } },
        { $group: { _id: null, total: { $sum: "$consultationFee" }, count: { $sum: 1 } } }
      ]),
      Consultation.aggregate([
        { $match: { paymentStatus: "pending", consultationFee: { $gt: 0 }, ...dateMatch } },
        { $group: { _id: null, total: { $sum: "$consultationFee" }, count: { $sum: 1 } } }
      ]),
    ]);

    const orderRevenue       = orderPaid[0]?.total    || 0;
    const consultRevenue     = consultPaid[0]?.total  || 0;
    const totalRevenue       = orderRevenue + consultRevenue;
    const totalCommission    = Math.round(orderRevenue * COMMISSION_RATE * 100) / 100;
    const farmerPayouts      = Math.round((orderRevenue - totalCommission) * 100) / 100;

    return {
      totalRevenue,
      orderRevenue,
      consultationRevenue: consultRevenue,
      totalCommission,
      farmerPayouts,
      pendingAmount:  (orderPending[0]?.total || 0) + (consultPending[0]?.total || 0),
      pendingCount:   (orderPending[0]?.count || 0) + (consultPending[0]?.count || 0),
      refundedAmount: orderRefunded[0]?.total || 0,
      refundedCount:  orderRefunded[0]?.count || 0,
      failedCount:    orderFailed[0]?.count   || 0,
      totalOrders:    orderPaid[0]?.count     || 0,
      totalConsultations: consultPaid[0]?.count || 0,
      commissionRate: COMMISSION_RATE * 100,
    };
  });

/* ── 2. Revenue Trends ── */
export const fetchTrends = (filters = {}) =>
  getOrSetCache(`earnings_trends_${JSON.stringify(filters)}`, TTL, async () => {
    const dateMatch = buildDateMatch(filters.from, filters.to);
    const dateFmt   = filters.period === "monthly" ? "%Y-%m"
                    : filters.period === "weekly"  ? "%Y-W%V"
                    : "%Y-%m-%d";

    const [orderTrends, consultTrends] = await Promise.all([
      Payment.aggregate([
        { $match: { status: "paid", ...dateMatch } },
        { $group: { _id: { $dateToString: { format: dateFmt, date: "$createdAt" } }, revenue: { $sum: "$amount" }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Consultation.aggregate([
        { $match: { paymentStatus: "paid", consultationFee: { $gt: 0 }, ...dateMatch } },
        { $group: { _id: { $dateToString: { format: dateFmt, date: "$createdAt" } }, revenue: { $sum: "$consultationFee" }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
    ]);

    // Merge by date
    const map = {};
    orderTrends.forEach(d => {
      map[d._id] = { date: d._id, orderRevenue: d.revenue, consultRevenue: 0, orders: d.count, consultations: 0 };
    });
    consultTrends.forEach(d => {
      if (map[d._id]) { map[d._id].consultRevenue = d.revenue; map[d._id].consultations = d.count; }
      else map[d._id] = { date: d._id, orderRevenue: 0, consultRevenue: d.revenue, orders: 0, consultations: d.count };
    });

    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date)).map(d => ({
      date:         d.date,
      revenue:      Math.round((d.orderRevenue + d.consultRevenue) * 100) / 100,
      orderRevenue: Math.round(d.orderRevenue * 100) / 100,
      consultRevenue: Math.round(d.consultRevenue * 100) / 100,
      commission:   Math.round(d.orderRevenue * COMMISSION_RATE * 100) / 100,
      farmerPayout: Math.round(d.orderRevenue * (1 - COMMISSION_RATE) * 100) / 100,
      orders:       d.orders,
      consultations: d.consultations,
    }));
  });

/* ── 3. Transactions (orders + consultations merged) ── */
export const fetchTransactions = async (filters = {}) => {
  const { from, to, status, method, type, page = 1, limit = 20 } = filters;

  const dateFilter = {};
  if (from || to) {
    dateFilter.createdAt = {};
    if (from) dateFilter.createdAt.$gte = new Date(from);
    if (to)   dateFilter.createdAt.$lte = new Date(to);
  }

  // Order payments
  const orderMatch = { ...dateFilter };
  if (status) orderMatch.status = status;
  if (method) orderMatch.paymentGateway = method;

  // Consultation payments
  const consultMatch = { consultationFee: { $gt: 0 }, ...dateFilter };
  if (status) consultMatch.paymentStatus = status === "paid" ? "paid" : status === "pending" ? "pending" : status;

  const [orderDocs, consultDocs] = await Promise.all([
    (type === "consultation" ? Promise.resolve([]) :
      Payment.find(orderMatch)
        .populate("buyer", "name email city")
        .sort({ createdAt: -1 })
        .lean()
    ),
    (type === "order" ? Promise.resolve([]) :
      Consultation.find(consultMatch)
        .populate("user",   "name email city role")
        .populate("expert", "name email city")
        .sort({ createdAt: -1 })
        .lean()
    ),
  ]);

  const orderRows = orderDocs.map(p => ({
    _id:           p._id,
    type:          "order",
    txId:          p.gatewayOrderId || p._id.toString().slice(-8),
    payer:         p.buyer,
    payerRole:     "buyer",
    recipient:     null,
    description:   `Order Payment`,
    amount:        p.amount,
    commission:    Math.round(p.amount * COMMISSION_RATE * 100) / 100,
    farmerPayout:  Math.round(p.amount * (1 - COMMISSION_RATE) * 100) / 100,
    paymentStatus: p.status,
    paymentMethod: p.paymentGateway,
    paymentId:     p.paymentId || p.gatewayOrderId,
    createdAt:     p.createdAt,
  }));

  const consultRows = consultDocs.map(c => ({
    _id:           c._id,
    type:          "consultation",
    txId:          c.paymentId || c._id.toString().slice(-8),
    payer:         c.user,
    payerRole:     c.user?.role || "farmer",
    recipient:     c.expert,
    description:   `Advisory: ${c.cropType} — ${c.problemCategory}`,
    amount:        c.consultationFee,
    commission:    0,
    farmerPayout:  0,
    paymentStatus: c.paymentStatus,
    paymentMethod: "direct",
    paymentId:     c.paymentId,
    createdAt:     c.createdAt,
  }));

  const all = [...orderRows, ...consultRows].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const total = all.length;
  const start = (Number(page) - 1) * Number(limit);
  const transactions = all.slice(start, start + Number(limit));

  return { transactions, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
};

/* ── 4. Commission Analytics ── */
export const fetchCommission = (filters = {}) =>
  getOrSetCache(`earnings_commission_${JSON.stringify(filters)}`, TTL, async () => {
    const dateMatch = buildDateMatch(filters.from, filters.to);

    const [byCrop, byMethod, byRegion] = await Promise.all([
      Order.aggregate([
        { $match: { paymentStatus: "paid", ...dateMatch } },
        { $unwind: "$items" },
        { $group: { _id: "$items.cropName", revenue: { $sum: "$items.subtotal" }, commission: { $sum: { $multiply: ["$items.subtotal", COMMISSION_RATE] } }, orders: { $sum: 1 } } },
        { $sort: { revenue: -1 } }, { $limit: 10 },
        { $project: { _id: 0, crop: "$_id", revenue: { $round: ["$revenue", 2] }, commission: { $round: ["$commission", 2] }, orders: 1 } }
      ]),
      Payment.aggregate([
        { $match: { status: "paid", ...dateMatch } },
        { $group: { _id: "$paymentGateway", revenue: { $sum: "$amount" }, commission: { $sum: { $multiply: ["$amount", COMMISSION_RATE] } }, count: { $sum: 1 } } },
        { $project: { _id: 0, method: "$_id", revenue: { $round: ["$revenue", 2] }, commission: { $round: ["$commission", 2] }, count: 1 } }
      ]),
      Order.aggregate([
        { $match: { paymentStatus: "paid", ...dateMatch } },
        { $lookup: { from: "users", localField: "farmer", foreignField: "_id", as: "farmerData" } },
        { $unwind: { path: "$farmerData", preserveNullAndEmptyArrays: true } },
        { $group: { _id: "$farmerData.city", revenue: { $sum: "$totalAmount" }, commission: { $sum: { $multiply: ["$totalAmount", COMMISSION_RATE] } }, orders: { $sum: 1 } } },
        { $sort: { revenue: -1 } }, { $limit: 8 },
        { $project: { _id: 0, region: "$_id", revenue: { $round: ["$revenue", 2] }, commission: { $round: ["$commission", 2] }, orders: 1 } }
      ])
    ]);

    return { byCrop, byMethod, byRegion };
  });

/* ── 5. Farmer Payouts ── */
export const fetchPayouts = async (filters = {}) => {
  const { status, page = 1, limit = 15 } = filters;
  const match = { paymentStatus: "paid" };
  if (status === "released") match.escrowReleased = true;
  if (status === "pending")  match.escrowReleased = false;

  const [docs, total] = await Promise.all([
    Order.find(match)
      .populate("farmer", "name email city state phone")
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean(),
    Order.countDocuments(match)
  ]);

  return {
    payouts: docs.map(o => ({
      _id:           o._id,
      orderId:       o.orderId,
      farmer:        o.farmer,
      grossAmount:   o.totalAmount,
      commission:    Math.round(o.totalAmount * COMMISSION_RATE * 100) / 100,
      payableAmount: Math.round(o.totalAmount * (1 - COMMISSION_RATE) * 100) / 100,
      escrowReleased:    o.escrowReleased,
      escrowReleasedAt:  o.escrowReleasedAt,
      orderStatus:   o.orderStatus,
      createdAt:     o.createdAt
    })),
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit))
  };
};

export const releasePayout = async (orderId) => {
  const order = await Order.findById(orderId);
  if (!order) throw Object.assign(new Error("Order not found"), { status: 404 });
  if (order.escrowReleased) throw Object.assign(new Error("Payout already released"), { status: 400 });
  if (order.paymentStatus !== "paid") throw Object.assign(new Error("Order not paid"), { status: 400 });
  order.escrowReleased   = true;
  order.escrowReleasedAt = new Date();
  await order.save();
  return { released: true, orderId: order.orderId, amount: Math.round(order.totalAmount * (1 - COMMISSION_RATE) * 100) / 100 };
};

/* ── 6. Payment Status ── */
export const fetchPaymentStatus = (filters = {}) =>
  getOrSetCache(`earnings_payment_status_${JSON.stringify(filters)}`, TTL, async () => {
    const dateMatch = buildDateMatch(filters.from, filters.to);

    const [orderStats, consultStats] = await Promise.all([
      Payment.aggregate([
        { $match: { ...dateMatch } },
        { $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: "$amount" } } }
      ]),
      Consultation.aggregate([
        { $match: { consultationFee: { $gt: 0 }, ...dateMatch } },
        { $group: { _id: "$paymentStatus", count: { $sum: 1 }, amount: { $sum: "$consultationFee" } } }
      ]),
    ]);

    const map = {
      paid:    { count: 0, amount: 0 },
      pending: { count: 0, amount: 0 },
      failed:  { count: 0, amount: 0 },
      refunded:{ count: 0, amount: 0 },
    };

    // order statuses: created=pending, paid, failed, refunded
    orderStats.forEach(s => {
      const key = s._id === "created" || s._id === "attempted" ? "pending" : s._id;
      if (map[key]) { map[key].count += s.count; map[key].amount += s.amount; }
    });
    consultStats.forEach(s => {
      const key = s._id === "pending" ? "pending" : s._id;
      if (map[key]) { map[key].count += s.count; map[key].amount += s.amount; }
    });

    Object.keys(map).forEach(k => { map[k].amount = Math.round(map[k].amount * 100) / 100; });
    const total = Object.values(map).reduce((s, v) => s + v.count, 0);
    return { ...map, total, successRate: total > 0 ? Math.round((map.paid.count / total) * 100) : 0 };
  });

/* ── 7. Revenue Forecast ── */
export const fetchForecast = () =>
  getOrSetCache("earnings_forecast", 300, async () => {
    const last90 = new Date();
    last90.setDate(last90.getDate() - 90);

    const [orderHistory, consultHistory] = await Promise.all([
      Payment.aggregate([
        { $match: { status: "paid", createdAt: { $gte: last90 } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, revenue: { $sum: "$amount" } } },
        { $sort: { _id: 1 } }
      ]),
      Consultation.aggregate([
        { $match: { paymentStatus: "paid", consultationFee: { $gt: 0 }, createdAt: { $gte: last90 } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, revenue: { $sum: "$consultationFee" } } },
        { $sort: { _id: 1 } }
      ]),
    ]);

    // Merge
    const map = {};
    orderHistory.forEach(d => { map[d._id] = (map[d._id] || 0) + d.revenue; });
    consultHistory.forEach(d => { map[d._id] = (map[d._id] || 0) + d.revenue; });
    const history = Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([date, revenue]) => ({ date, revenue: Math.round(revenue * 100) / 100 }));

    if (history.length < 7) return { history, forecast: [], trend: "insufficient_data", growthRate: 0 };

    const values = history.map(h => h.revenue);
    const n = values.length;
    const avgRecent = values.slice(-14).reduce((a, b) => a + b, 0) / Math.min(14, n);
    const avgOlder  = values.slice(0, Math.min(14, n)).reduce((a, b) => a + b, 0) / Math.min(14, n);
    const growthRate  = avgOlder > 0 ? ((avgRecent - avgOlder) / avgOlder) * 100 : 0;
    const dailyGrowth = growthRate / 100 / 30;

    const forecast = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i + 1);
      return { date: d.toISOString().split("T")[0], predicted: Math.round(avgRecent * (1 + dailyGrowth * (i + 1)) * 100) / 100 };
    });

    return { history, forecast, trend: growthRate > 2 ? "growing" : growthRate < -2 ? "declining" : "stable", growthRate: Math.round(growthRate * 10) / 10 };
  });
