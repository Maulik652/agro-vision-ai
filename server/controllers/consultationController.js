import * as svc from "../services/consultationService.js";

const ok   = (res, data, status = 200) => res.status(status).json({ success: true, data });
const fail = (res, err) => res.status(err.status || 500).json({ success: false, message: err.message });

export const getOverview          = async (req, res) => { try { ok(res, await svc.fetchOverview(req.user._id)); } catch (e) { fail(res, e); } };

export const getConsultations     = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    ok(res, await svc.fetchConsultations(req.user._id, { status, page: Number(page), limit: Number(limit) }));
  } catch (e) { fail(res, e); }
};

export const getConsultationById  = async (req, res) => { try { ok(res, await svc.fetchConsultationById(req.params.id, req.user._id)); } catch (e) { fail(res, e); } };

export const acceptConsultation   = async (req, res) => { try { ok(res, await svc.acceptConsultation(req.params.id, req.user._id)); } catch (e) { fail(res, e); } };

export const rejectConsultation   = async (req, res) => {
  try {
    const { reason } = req.body;
    ok(res, await svc.rejectConsultation(req.params.id, req.user._id, reason));
  } catch (e) { fail(res, e); }
};

export const scheduleConsultation = async (req, res) => {
  try {
    const { date, time, meetingType, meetingLink, notes } = req.body;
    if (!date || !time) return res.status(400).json({ success: false, message: "date and time are required" });
    ok(res, await svc.scheduleConsultation(req.params.id, req.user._id, { date, time, meetingType, meetingLink, notes }));
  } catch (e) { fail(res, e); }
};

export const completeConsultation = async (req, res) => { try { ok(res, await svc.completeConsultation(req.params.id, req.user._id)); } catch (e) { fail(res, e); } };

export const postRecommendation   = async (req, res) => {
  try {
    const { treatmentAdvice, fertilizerSuggestion, marketGuidance, followUpRequired, followUpDate } = req.body;
    ok(res, await svc.saveRecommendation(req.params.id, req.user._id, { treatmentAdvice, fertilizerSuggestion, marketGuidance, followUpRequired, followUpDate }), 201);
  } catch (e) { fail(res, e); }
};

export const getMessages          = async (req, res) => { try { ok(res, await svc.fetchMessages(req.params.id, req.user._id)); } catch (e) { fail(res, e); } };

export const postMessage          = async (req, res) => {
  try {
    const { message, messageType, attachments } = req.body;
    if (!message && messageType === "text") return res.status(400).json({ success: false, message: "message is required" });
    ok(res, await svc.sendMessage(req.params.id, req.user._id, { message, messageType, attachments }), 201);
  } catch (e) { fail(res, e); }
};

export const getHistory           = async (req, res) => {
  try {
    const { user, crop, date, page = 1, limit = 20 } = req.query;
    ok(res, await svc.fetchHistory(req.user._id, { user, crop, date, page: Number(page), limit: Number(limit) }));
  } catch (e) { fail(res, e); }
};
