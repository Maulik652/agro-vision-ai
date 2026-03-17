import Consultation from "../models/Consultation.js";
import ConsultationMessage from "../models/ConsultationMessage.js";
import ConsultationRecommendation from "../models/ConsultationRecommendation.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { getOrSetCache, deleteCache } from "../config/redis.js";
import { getSocketServer } from "../realtime/socketServer.js";

const CACHE_TTL = 120;

const invalidateExpertCache = async (expertId) => {
  await Promise.all([
    deleteCache(`consultations_overview_${expertId}`),
    deleteCache(`consultations_list_${expertId}`),
    deleteCache(`consultations_history_${expertId}`)
  ]);
};

const emitConsultationEvent = (event, payload) => {
  const io = getSocketServer();
  if (!io) return;
  const { expertId, userId } = payload;
  if (expertId) io.to(`user:${expertId}`).emit(event, { ...payload, emittedAt: new Date().toISOString() });
  if (userId)   io.to(`user:${userId}`).emit(event, { ...payload, emittedAt: new Date().toISOString() });
};

/* ─── OVERVIEW ─────────────────────────────────────────────────────────────── */
export const fetchOverview = (expertId) =>
  getOrSetCache(`consultations_overview_${expertId}`, CACHE_TTL, async () => {
    const [pending, active, completed, all] = await Promise.all([
      Consultation.countDocuments({ expert: expertId, status: "pending" }),
      Consultation.countDocuments({ expert: expertId, status: { $in: ["accepted", "scheduled", "in_progress"] } }),
      Consultation.countDocuments({ expert: expertId, status: "completed" }),
      Consultation.find({ expert: expertId, acceptedAt: { $exists: true } })
        .select("createdAt acceptedAt").lean()
    ]);

    const avgMs = all.length
      ? all.reduce((s, c) => s + (new Date(c.acceptedAt) - new Date(c.createdAt)), 0) / all.length
      : 0;
    const avgResponseHours = Math.round(avgMs / 3_600_000);

    return { pending, active, completed, avgResponseHours };
  });

/* ─── LIST ──────────────────────────────────────────────────────────────────── */
export const fetchConsultations = (expertId, { status, page = 1, limit = 20 } = {}) => {
  const cacheKey = `consultations_list_${expertId}_${status || "all"}_${page}`;
  return getOrSetCache(cacheKey, CACHE_TTL, async () => {
    const filter = { expert: expertId };
    if (status) filter.status = status;

    const [docs, total] = await Promise.all([
      Consultation.find(filter)
        .populate("user", "name email phone city state")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Consultation.countDocuments(filter)
    ]);

    return { consultations: docs, total, page, pages: Math.ceil(total / limit) };
  });
};

/* ─── SINGLE ────────────────────────────────────────────────────────────────── */
export const fetchConsultationById = async (id, expertId) => {
  const doc = await Consultation.findOne({ _id: id, expert: expertId })
    .populate("user", "name email phone city state avatar")
    .lean();
  if (!doc) throw Object.assign(new Error("Consultation not found"), { status: 404 });
  return doc;
};

/* ─── ACCEPT ────────────────────────────────────────────────────────────────── */
export const acceptConsultation = async (id, expertId) => {
  const doc = await Consultation.findOne({ _id: id, expert: expertId });
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });
  if (doc.status !== "pending") throw Object.assign(new Error("Only pending consultations can be accepted"), { status: 400 });

  doc.status = "accepted";
  doc.acceptedAt = new Date();
  await doc.save();
  await invalidateExpertCache(expertId);

  await Notification.create({
    user: doc.user,
    type: "system",
    title: "Consultation Accepted",
    message: `Your consultation request for ${doc.cropType} has been accepted by the expert.`,
    priority: "high",
    data: { consultationId: doc._id }
  });

  emitConsultationEvent("consultation_accepted", {
    expertId: String(expertId),
    userId: String(doc.user),
    consultationId: String(doc._id),
    cropType: doc.cropType
  });

  return doc;
};

/* ─── REJECT ────────────────────────────────────────────────────────────────── */
export const rejectConsultation = async (id, expertId, reason = "") => {
  const doc = await Consultation.findOne({ _id: id, expert: expertId });
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });
  if (doc.status !== "pending") throw Object.assign(new Error("Only pending consultations can be rejected"), { status: 400 });

  doc.status = "rejected";
  doc.rejectionReason = reason;
  await doc.save();
  await invalidateExpertCache(expertId);

  await Notification.create({
    user: doc.user,
    type: "system",
    title: "Consultation Rejected",
    message: `Your consultation request for ${doc.cropType} was not accepted. Reason: ${reason || "Not specified"}`,
    priority: "normal",
    data: { consultationId: doc._id }
  });

  return doc;
};

/* ─── SCHEDULE ──────────────────────────────────────────────────────────────── */
export const scheduleConsultation = async (id, expertId, { date, time, meetingType, meetingLink, notes }) => {
  const doc = await Consultation.findOne({ _id: id, expert: expertId });
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });
  if (doc.status !== "accepted") throw Object.assign(new Error("Only accepted consultations can be scheduled"), { status: 400 });
  if (doc.consultationFee > 0 && doc.paymentStatus !== "paid")
    throw Object.assign(new Error("Payment required before scheduling"), { status: 402 });

  doc.status = "scheduled";
  doc.scheduledMeeting = { date, time, meetingType: meetingType || "video", meetingLink: meetingLink || "", notes: notes || "" };
  await doc.save();
  await invalidateExpertCache(expertId);

  await Notification.create({
    user: doc.user,
    type: "system",
    title: "Consultation Scheduled",
    message: `Your consultation is scheduled for ${date} at ${time}.`,
    priority: "high",
    data: { consultationId: doc._id, date, time }
  });

  emitConsultationEvent("consultation_scheduled", {
    expertId: String(expertId),
    userId: String(doc.user),
    consultationId: String(doc._id),
    date, time, meetingType
  });

  return doc;
};

/* ─── COMPLETE ──────────────────────────────────────────────────────────────── */
export const completeConsultation = async (id, expertId) => {
  const doc = await Consultation.findOne({ _id: id, expert: expertId });
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });
  if (!["scheduled", "in_progress"].includes(doc.status))
    throw Object.assign(new Error("Cannot complete consultation in current state"), { status: 400 });

  doc.status = "completed";
  doc.completedAt = new Date();
  await doc.save();
  await invalidateExpertCache(expertId);

  emitConsultationEvent("consultation_completed", {
    expertId: String(expertId),
    userId: String(doc.user),
    consultationId: String(doc._id)
  });

  return doc;
};

/* ─── RECOMMENDATION ────────────────────────────────────────────────────────── */
export const saveRecommendation = async (id, expertId, body) => {
  const doc = await Consultation.findOne({ _id: id, expert: expertId });
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });

  const rec = await ConsultationRecommendation.findOneAndUpdate(
    { consultation: id, expert: expertId },
    { ...body, consultation: id, expert: expertId },
    { upsert: true, new: true }
  );

  return rec;
};

/* ─── MESSAGES ──────────────────────────────────────────────────────────────── */
export const fetchMessages = async (consultationId, expertId) => {
  const doc = await Consultation.findOne({ _id: consultationId, expert: expertId }).lean();
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });

  return ConsultationMessage.find({ consultation: consultationId })
    .populate("sender", "name avatar role")
    .sort({ createdAt: 1 })
    .lean();
};

export const sendMessage = async (consultationId, senderId, { message, messageType = "text", attachments = [] }) => {
  const doc = await Consultation.findById(consultationId).lean();
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });

  const msg = await ConsultationMessage.create({
    consultation: consultationId,
    sender: senderId,
    message,
    messageType,
    attachments
  });

  const populated = await msg.populate("sender", "name avatar role");

  const io = getSocketServer();
  if (io) {
    const room = `consultation:${consultationId}`;
    io.to(room).emit("consultation_message", {
      consultationId,
      message: populated,
      emittedAt: new Date().toISOString()
    });
  }

  return populated;
};

/* ─── HISTORY ───────────────────────────────────────────────────────────────── */
export const fetchHistory = (expertId, { user, crop, date, page = 1, limit = 20 } = {}) => {
  const cacheKey = `consultations_history_${expertId}_${user || ""}_${crop || ""}_${date || ""}_${page}`;
  return getOrSetCache(cacheKey, CACHE_TTL, async () => {
    const filter = { expert: expertId, status: "completed" };
    if (user) filter.user = user;
    if (crop) filter.cropType = { $regex: new RegExp(crop, "i") };
    if (date) {
      const d = new Date(date);
      filter.completedAt = { $gte: d, $lt: new Date(d.getTime() + 86_400_000) };
    }

    const [docs, total] = await Promise.all([
      Consultation.find(filter)
        .populate("user", "name email city state")
        .sort({ completedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Consultation.countDocuments(filter)
    ]);

    return { consultations: docs, total, page, pages: Math.ceil(total / limit) };
  });
};
