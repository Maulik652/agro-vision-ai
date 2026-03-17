import * as svc from "../services/activeConsultationService.js";
import api from "../config/aiServiceClient.js";

const ok   = (res, data, status = 200) => res.status(status).json({ success: true, data });
const fail = (res, err) => res.status(err.status || 500).json({ success: false, message: err.message });

/* ── Active list ─────────────────────────────────────────────────────────── */
export const getActiveConsultations = async (req, res) => {
  try {
    const { search, crop, priority } = req.query;
    ok(res, await svc.fetchActiveConsultations(req.user._id, { search, crop, priority }));
  } catch (e) { fail(res, e); }
};

/* ── Detail ──────────────────────────────────────────────────────────────── */
export const getDetail = async (req, res) => {
  try { ok(res, await svc.fetchDetail(req.params.id, req.user._id)); }
  catch (e) { fail(res, e); }
};

/* ── Start ───────────────────────────────────────────────────────────────── */
export const startConsultation = async (req, res) => {
  try { ok(res, await svc.startConsultation(req.params.id, req.user._id)); }
  catch (e) { fail(res, e); }
};

/* ── Complete ────────────────────────────────────────────────────────────── */
export const completeConsultation = async (req, res) => {
  try { ok(res, await svc.completeConsultation(req.params.id, req.user._id)); }
  catch (e) { fail(res, e); }
};

/* ── Escalate ────────────────────────────────────────────────────────────── */
export const escalateConsultation = async (req, res) => {
  try {
    const { reason } = req.body;
    ok(res, await svc.escalateConsultation(req.params.id, req.user._id, reason));
  } catch (e) { fail(res, e); }
};

/* ── Messages ────────────────────────────────────────────────────────────── */
export const getMessages = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    ok(res, await svc.fetchMessages(req.params.id, req.user._id, { page: Number(page), limit: Number(limit) }));
  } catch (e) { fail(res, e); }
};

export const postMessage = async (req, res) => {
  try {
    const { message, messageType, attachments } = req.body;
    ok(res, await svc.sendMessage(req.params.id, req.user._id, { message, messageType, attachments }), 201);
  } catch (e) { fail(res, e); }
};

export const markRead = async (req, res) => {
  try { ok(res, await svc.markMessagesRead(req.params.id, req.user._id)); }
  catch (e) { fail(res, e); }
};

/* ── Recommendation ──────────────────────────────────────────────────────── */
export const postRecommendation = async (req, res) => {
  try {
    const { treatmentAdvice, fertilizerSuggestion, marketGuidance, followUpRequired, followUpDate } = req.body;
    ok(res, await svc.saveRecommendation(req.params.id, req.user._id, {
      treatmentAdvice, fertilizerSuggestion, marketGuidance, followUpRequired, followUpDate
    }), 201);
  } catch (e) { fail(res, e); }
};

/* ── Timeline ────────────────────────────────────────────────────────────── */
export const getTimeline = async (req, res) => {
  try { ok(res, await svc.fetchTimeline(req.params.id)); }
  catch (e) { fail(res, e); }
};

/* ── AI Insights ─────────────────────────────────────────────────────────── */
export const triggerAIAnalysis = async (req, res) => {
  try {
    const { imageUrl, cropType, description } = req.body;
    // Call Python AI service
    let insights = { disease: "Analysis pending", confidence: 0, treatment: "", severity: "low" };
    try {
      const aiRes = await api.post("/disease-detection", { imageUrl, cropType, description });
      insights = aiRes.data?.data || aiRes.data || insights;
    } catch {
      // AI service unavailable — store placeholder
    }
    ok(res, await svc.saveAIInsights(req.params.id, req.user._id, insights));
  } catch (e) { fail(res, e); }
};

/* ── AI Assistant (smart reply suggestions) ──────────────────────────────── */
export const getAIAssistant = async (req, res) => {
  try {
    const { cropType, problemDescription, lastMessage } = req.body;
    let suggestions = [];
    try {
      const aiRes = await api.post("/expert-assistant", { cropType, problemDescription, lastMessage });
      suggestions = aiRes.data?.data?.suggestions || aiRes.data?.suggestions || [];
    } catch {
      // Fallback suggestions
      suggestions = [
        `Based on the ${cropType} issue described, I recommend checking for early signs of fungal infection.`,
        "Please share a close-up image of the affected area for better diagnosis.",
        "Have you applied any pesticides in the last 2 weeks?"
      ];
    }
    ok(res, { suggestions });
  } catch (e) { fail(res, e); }
};
