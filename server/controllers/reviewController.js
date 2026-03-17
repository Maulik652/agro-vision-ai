import * as svc from "../services/reviewService.js";

const ok  = (res, data, status = 200) => res.status(status).json({ success: true, data });
const err = (res, e) => res.status(e.status || 500).json({ success: false, message: e.message || "Server error" });

export const getOverview         = async (req, res) => { try { ok(res, await svc.fetchOverview()); } catch (e) { err(res, e); } };
export const getFeed             = async (req, res) => { try { ok(res, await svc.fetchFeed(req.query)); } catch (e) { err(res, e); } };
export const getById             = async (req, res) => { try { ok(res, await svc.fetchById(req.params.id)); } catch (e) { err(res, e); } };
export const createReview        = async (req, res) => { try { ok(res, await svc.createReview(req.user._id, req.body), 201); } catch (e) { err(res, e); } };
export const reportReview        = async (req, res) => { try { ok(res, await svc.reportReview(req.params.id, req.user._id, req.body)); } catch (e) { err(res, e); } };
export const moderateReview      = async (req, res) => { try { ok(res, await svc.moderateReview(req.params.id, req.user._id, req.body)); } catch (e) { err(res, e); } };
export const getAnalytics        = async (req, res) => { try { ok(res, await svc.fetchAnalytics(req.query.targetUser)); } catch (e) { err(res, e); } };
export const getQualityReviews   = async (req, res) => { try { ok(res, await svc.fetchQualityReviews({ ...req.query, expertId: req.user._id })); } catch (e) { err(res, e); } };
export const createQualityReview = async (req, res) => { try { ok(res, await svc.createQualityReview(req.user._id, req.body), 201); } catch (e) { err(res, e); } };
export const getModerationQueue  = async (req, res) => { try { ok(res, await svc.fetchModerationQueue(req.query)); } catch (e) { err(res, e); } };

// Sentiment + spam (inline AI — no external service needed)
export const analyzeSentiment = (req, res) => {
  const { text = "" } = req.body;
  const t = text.toLowerCase();
  const pos = ["excellent","great","amazing","good","best","happy","satisfied","perfect","wonderful","love","helpful","recommend","outstanding","fantastic","superb"];
  const neg = ["bad","poor","terrible","worst","awful","disappointed","useless","waste","fraud","fake","horrible","pathetic","scam","cheat","rude"];
  let score = 0;
  pos.forEach(w => { if (t.includes(w)) score += 1; });
  neg.forEach(w => { if (t.includes(w)) score -= 1; });
  const sentiment = score > 0 ? "positive" : score < 0 ? "negative" : "neutral";
  const confidence = parseFloat(Math.min(Math.abs(score) / 3, 1).toFixed(2));
  ok(res, { sentiment, confidence, score });
};

export const detectSpam = (req, res) => {
  const { text = "", rating } = req.body;
  const t = text.toLowerCase();
  let score = 0;
  if (text.length < 10) score += 0.3;
  if (/(.)\1{4,}/.test(t)) score += 0.3;
  if (/https?:\/\//.test(t)) score += 0.2;
  if ((t.match(/[!?]{2,}/g) || []).length > 2) score += 0.1;
  if (text.length > 10 && rating === 1 && !t.includes(" ")) score += 0.2;
  const spamScore = parseFloat(Math.min(score, 1).toFixed(2));
  ok(res, { spamScore, flagged: spamScore >= 0.7 });
};
