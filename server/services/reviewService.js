import Review       from "../models/Review.js";
import ReviewReport  from "../models/ReviewReport.js";
import QualityReview from "../models/QualityReview.js";
import User          from "../models/User.js";
import { getOrSetCache, deleteCache } from "../config/redis.js";
import { getSocketServer } from "../realtime/socketServer.js";

const TTL = 60;

const invalidate = async (targetUserId) => {
  await Promise.all([
    deleteCache(`reviews_overview`),
    deleteCache(`reviews_feed_${targetUserId}`),
    deleteCache(`reviews_analytics_${targetUserId}`),
  ]);
};

const emit = (event, payload) => {
  const io = getSocketServer();
  if (!io) return;
  io.to(`user:${payload.targetUserId}`).emit(event, { ...payload, emittedAt: new Date().toISOString() });
};

/* ── AI Sentiment (rule-based fallback — no external dep) ── */
const analyzeSentiment = (text = "") => {
  const t = text.toLowerCase();
  const pos = ["excellent","great","amazing","good","best","happy","satisfied","perfect","wonderful","love","helpful","recommend","outstanding","fantastic","superb"];
  const neg = ["bad","poor","terrible","worst","awful","disappointed","useless","waste","fraud","fake","horrible","pathetic","scam","cheat","rude"];
  let score = 0;
  pos.forEach(w => { if (t.includes(w)) score += 1; });
  neg.forEach(w => { if (t.includes(w)) score -= 1; });
  const sentiment = score > 0 ? "positive" : score < 0 ? "negative" : "neutral";
  const confidence = Math.min(Math.abs(score) / 3, 1);
  return { sentiment, sentimentScore: parseFloat(confidence.toFixed(2)) };
};

/* ── Spam detection (heuristic) ── */
const detectSpam = (text = "", rating) => {
  const t = text.toLowerCase();
  let score = 0;
  if (text.length < 10) score += 0.3;
  if (/(.)\1{4,}/.test(t)) score += 0.3;           // repeated chars
  if (/https?:\/\//.test(t)) score += 0.2;          // URLs
  if ((t.match(/[!?]{2,}/g) || []).length > 2) score += 0.1;
  if (text.length > 10 && rating === 1 && !t.includes(" ")) score += 0.2;
  return parseFloat(Math.min(score, 1).toFixed(2));
};

/* ── 1. Overview ── */
export const fetchOverview = () =>
  getOrSetCache("reviews_overview", TTL, async () => {
    const [stats, reported] = await Promise.all([
      Review.aggregate([
        { $match: { status: "active" } },
        { $group: { _id: null, total: { $sum: 1 }, avgRating: { $avg: "$rating" }, fiveStar: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } } } }
      ]),
      Review.countDocuments({ status: "flagged" }),
    ]);
    const s = stats[0] || { total: 0, avgRating: 0, fiveStar: 0 };
    return {
      totalReviews:    s.total,
      avgRating:       parseFloat((s.avgRating || 0).toFixed(2)),
      fiveStarPct:     s.total > 0 ? Math.round((s.fiveStar / s.total) * 100) : 0,
      reportedReviews: reported,
    };
  });

/* ── 2. Feed ── */
export const fetchFeed = async (filters = {}) => {
  const { targetUser, role, crop, sort = "latest", page = 1, limit = 15, status = "active" } = filters;
  const match = { status };
  if (targetUser) match.targetUser = targetUser;
  if (role)       match["reviewer.role"] = role;
  if (crop)       match.cropName = { $regex: crop, $options: "i" };

  const sortMap = { latest: { createdAt: -1 }, highest: { rating: -1 }, lowest: { rating: 1 } };
  const sortObj = sortMap[sort] || sortMap.latest;

  const [docs, total] = await Promise.all([
    Review.find(match)
      .populate("reviewer",   "name avatar role city")
      .populate("targetUser", "name avatar role")
      .sort(sortObj)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean(),
    Review.countDocuments(match),
  ]);

  return { reviews: docs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
};

/* ── 3. Single review ── */
export const fetchById = async (id) => {
  const doc = await Review.findById(id)
    .populate("reviewer",   "name avatar role city state")
    .populate("targetUser", "name avatar role")
    .lean();
  if (!doc) throw Object.assign(new Error("Review not found"), { status: 404 });
  return doc;
};

/* ── 4. Create review ── */
export const createReview = async (reviewerId, body) => {
  const { targetUserId, transactionId, reviewType = "order", rating, comment = "", images = [], cropName = "" } = body;

  // Duplicate guard
  if (transactionId) {
    const exists = await Review.findOne({ reviewer: reviewerId, transactionId });
    if (exists) throw Object.assign(new Error("You already reviewed this transaction"), { status: 409 });
  }

  const { sentiment, sentimentScore } = analyzeSentiment(comment);
  const spamScore = detectSpam(comment, rating);
  const status = spamScore >= 0.7 ? "flagged" : "active";

  const review = await Review.create({
    reviewer: reviewerId, targetUser: targetUserId, transactionId,
    reviewType, rating, comment, images, cropName,
    sentiment, sentimentScore, spamScore, status,
  });

  // Update target user reputation
  await updateReputation(targetUserId);
  await invalidate(targetUserId);

  emit("new_review", { targetUserId: String(targetUserId), reviewId: String(review._id), rating, sentiment });

  // Also notify admin namespace for real-time moderation feed
  const io = getSocketServer();
  if (io) {
    const populated = await review.populate("reviewer", "name avatar role");
    io.of("/admin").to("admins").emit("new_review", {
      review: populated,
      emittedAt: new Date().toISOString(),
    });
  }

  return review.populate("reviewer", "name avatar role");
};

/* ── 5. Report review ── */
export const reportReview = async (reviewId, reportedBy, { reason, description = "" }) => {
  const review = await Review.findById(reviewId);
  if (!review) throw Object.assign(new Error("Review not found"), { status: 404 });

  await ReviewReport.create({ review: reviewId, reportedBy, reason, description });
  review.reportCount += 1;
  if (review.reportCount >= 3) review.status = "flagged";
  await review.save();

  emit("review_flagged", { targetUserId: String(review.targetUser), reviewId: String(review._id) });
  return { reported: true };
};

/* ── 6. Moderate (expert/admin) ── */
export const moderateReview = async (reviewId, moderatorId, { status }) => {
  const review = await Review.findByIdAndUpdate(
    reviewId,
    { status, moderatedAt: new Date(), moderatedBy: moderatorId },
    { new: true }
  );
  if (!review) throw Object.assign(new Error("Review not found"), { status: 404 });
  await updateReputation(review.targetUser);
  await invalidate(review.targetUser);
  return review;
};

/* ── 7. Analytics ── */
export const fetchAnalytics = (targetUserId) =>
  getOrSetCache(`reviews_analytics_${targetUserId || "all"}`, TTL, async () => {
    const match = { status: "active" };
    if (targetUserId) match.targetUser = new (await import("mongoose")).default.Types.ObjectId(targetUserId);

    const [dist, trend, topFarmers] = await Promise.all([
      Review.aggregate([
        { $match: match },
        { $group: { _id: "$rating", count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Review.aggregate([
        { $match: match },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }, { $limit: 30 }
      ]),
      Review.aggregate([
        { $match: { status: "active" } },
        { $group: { _id: "$targetUser", avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
        { $sort: { avgRating: -1, count: -1 } }, { $limit: 5 },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
        { $unwind: "$user" },
        { $project: { _id: 0, userId: "$_id", name: "$user.name", avatar: "$user.avatar", role: "$user.role", avgRating: { $round: ["$avgRating", 1] }, count: 1 } }
      ]),
    ]);

    const distribution = [1,2,3,4,5].map(r => ({ rating: r, count: dist.find(d => d._id === r)?.count || 0 }));
    return {
      distribution,
      trend: trend.map(t => ({ date: t._id, avgRating: parseFloat(t.avgRating.toFixed(2)), count: t.count })),
      topFarmers,
    };
  });

/* ── 8. Quality reviews (expert) ── */
export const fetchQualityReviews = (filters = {}) =>
  getOrSetCache(`quality_reviews_${JSON.stringify(filters)}`, TTL, async () => {
    const { expertId, page = 1, limit = 15 } = filters;
    const match = expertId ? { expert: expertId } : {};
    const [docs, total] = await Promise.all([
      QualityReview.find(match)
        .populate("expert", "name avatar")
        .populate("farmer", "name avatar city")
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .lean(),
      QualityReview.countDocuments(match),
    ]);
    return { reviews: docs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
  });

export const createQualityReview = async (expertId, body) => {
  const { cropId, farmerId, qualityRating, grading, diseaseRisk, feedback, images, cropName } = body;
  const doc = await QualityReview.create({ expert: expertId, cropId, farmer: farmerId, qualityRating, grading, diseaseRisk, feedback, images, cropName });
  await deleteCache(`quality_reviews_${expertId}`);
  return doc;
};

/* ── 9. Moderation queue ── */
export const fetchModerationQueue = (filters = {}) =>
  getOrSetCache(`moderation_queue_${JSON.stringify(filters)}`, 30, async () => {
    const { page = 1, limit = 20 } = filters;
    const match = { $or: [{ status: "flagged" }, { spamScore: { $gte: 0.5 } }] };
    const [docs, total] = await Promise.all([
      Review.find(match)
        .populate("reviewer",   "name avatar role")
        .populate("targetUser", "name avatar role")
        .sort({ reportCount: -1, createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .lean(),
      Review.countDocuments(match),
    ]);
    return { reviews: docs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
  });

/* ── Reputation score updater ── */
const updateReputation = async (userId) => {
  const stats = await Review.aggregate([
    { $match: { targetUser: userId, status: "active" } },
    { $group: { _id: null, avgRating: { $avg: "$rating" }, count: { $sum: 1 }, recent: { $sum: { $cond: [{ $gte: ["$createdAt", new Date(Date.now() - 30 * 86400000)] }, 1, 0] } } } }
  ]);
  if (!stats[0]) return;
  const { avgRating, count, recent } = stats[0];
  const reputationScore = parseFloat(
    ((avgRating * 0.6) + (Math.min(count / 50, 1) * 0.2) + (Math.min(recent / 10, 1) * 0.2)).toFixed(2)
  );
  await User.findByIdAndUpdate(userId, { reputationScore, avgRating: parseFloat(avgRating.toFixed(2)), reviewCount: count });
  emit("rating_update", { targetUserId: String(userId), reputationScore, avgRating });
};
