import Consultation from "../models/Consultation.js";
import ConsultationMessage from "../models/ConsultationMessage.js";
import ConsultationRecommendation from "../models/ConsultationRecommendation.js";
import TimelineEvent from "../models/TimelineEvent.js";
import Notification from "../models/Notification.js";
import { getOrSetCache, deleteCache } from "../config/redis.js";
import { getSocketServer } from "../realtime/socketServer.js";

const CACHE_TTL = 60;

const invalidate = async (expertId, consultationId) => {
  await Promise.all([
    deleteCache(`active_list_${expertId}`),
    deleteCache(`consultation_detail_${consultationId}`),
    deleteCache(`timeline_${consultationId}`)
  ]);
};

const emit = (room, event, payload) => {
  const io = getSocketServer();
  if (io) io.to(room).emit(event, { ...payload, emittedAt: new Date().toISOString() });
};

const addTimeline = (consultationId, eventType, description, actor, meta = {}) =>
  TimelineEvent.create({ consultation: consultationId, eventType, description, actor, meta });

/* ── Active list ─────────────────────────────────────────────────────────── */
export const fetchActiveConsultations = (expertId, { search = "", crop = "", priority = "" } = {}) => {
  const key = `active_list_${expertId}_${search}_${crop}_${priority}`;
  return getOrSetCache(key, CACHE_TTL, async () => {
    const filter = {
      expert: expertId,
      status: { $in: ["scheduled", "in_progress"] }
    };
    if (crop)     filter.cropType     = { $regex: new RegExp(crop, "i") };
    if (priority) filter.priority     = priority;

    const docs = await Consultation.find(filter)
      .populate("user", "name avatar city state")
      .sort({ updatedAt: -1 })
      .lean();

    // Attach last message + unread count
    const enriched = await Promise.all(
      docs.map(async (c) => {
        const [lastMsg, unread] = await Promise.all([
          ConsultationMessage.findOne({ consultation: c._id })
            .sort({ createdAt: -1 })
            .select("message messageType createdAt sender")
            .lean(),
          ConsultationMessage.countDocuments({ consultation: c._id, read: false, sender: { $ne: expertId } })
        ]);
        return { ...c, lastMessage: lastMsg || null, unreadCount: unread };
      })
    );

    if (search) {
      const re = new RegExp(search, "i");
      return enriched.filter((c) => re.test(c.user?.name) || re.test(c.cropType) || re.test(c.problemCategory));
    }

    return enriched;
  });
};

/* ── Detail ──────────────────────────────────────────────────────────────── */
export const fetchDetail = (id, expertId) =>
  getOrSetCache(`consultation_detail_${id}`, CACHE_TTL, async () => {
    const doc = await Consultation.findOne({ _id: id, expert: expertId })
      .populate("user", "name email phone avatar city state")
      .lean();
    if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });
    const recommendation = await ConsultationRecommendation.findOne({ consultation: id }).lean();
    return { ...doc, recommendation: recommendation || null };
  });

/* ── Start (scheduled → in_progress) ────────────────────────────────────── */
export const startConsultation = async (id, expertId) => {
  const doc = await Consultation.findOne({ _id: id, expert: expertId });
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });
  if (doc.status !== "scheduled")
    throw Object.assign(new Error("Only scheduled consultations can be started"), { status: 400 });

  doc.status = "in_progress";
  await doc.save();
  await invalidate(expertId, id);

  await addTimeline(id, "started", "Consultation session started by expert", expertId);

  emit(`consultation:${id}`, "consultation_status_changed", { consultationId: id, status: "in_progress" });
  emit(`user:${String(doc.user)}`, "consultation_status_changed", { consultationId: id, status: "in_progress" });

  await Notification.create({
    user: doc.user,
    type: "system",
    title: "Consultation Started",
    message: `Your consultation for ${doc.cropType} has started. Join the session now.`,
    priority: "high",
    data: { consultationId: id }
  });

  return doc;
};

/* ── Complete ────────────────────────────────────────────────────────────── */
export const completeConsultation = async (id, expertId) => {
  const doc = await Consultation.findOne({ _id: id, expert: expertId });
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });
  if (doc.status !== "in_progress")
    throw Object.assign(new Error("Only in-progress consultations can be completed"), { status: 400 });

  doc.status = "completed";
  doc.completedAt = new Date();
  await doc.save();
  await invalidate(expertId, id);

  await addTimeline(id, "completed", "Consultation marked as completed", expertId);

  emit(`consultation:${id}`, "consultation_status_changed", { consultationId: id, status: "completed" });
  emit(`user:${String(doc.user)}`, "consultation_status_changed", { consultationId: id, status: "completed" });

  return doc;
};

/* ── Escalate ────────────────────────────────────────────────────────────── */
export const escalateConsultation = async (id, expertId, reason = "") => {
  const doc = await Consultation.findOne({ _id: id, expert: expertId });
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });
  if (!["scheduled", "in_progress"].includes(doc.status))
    throw Object.assign(new Error("Cannot escalate in current state"), { status: 400 });

  doc.status = "escalated";
  doc.escalatedAt = new Date();
  await doc.save();
  await invalidate(expertId, id);

  await addTimeline(id, "escalated", `Escalated to admin. Reason: ${reason || "Not specified"}`, expertId, { reason });

  emit(`consultation:${id}`, "consultation_status_changed", { consultationId: id, status: "escalated" });

  return doc;
};

/* ── Messages ────────────────────────────────────────────────────────────── */
export const fetchMessages = async (id, expertId, { page = 1, limit = 50 } = {}) => {
  const doc = await Consultation.findOne({ _id: id, expert: expertId }).lean();
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });

  const [messages, total] = await Promise.all([
    ConsultationMessage.find({ consultation: id })
      .populate("sender", "name avatar role")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ConsultationMessage.countDocuments({ consultation: id })
  ]);

  // Mark as read
  await ConsultationMessage.updateMany(
    { consultation: id, sender: { $ne: expertId }, read: false },
    { $set: { read: true } }
  );

  return { messages: messages.reverse(), total, page, pages: Math.ceil(total / limit) };
};

export const sendMessage = async (id, expertId, { message, messageType = "text", attachments = [] }) => {
  const doc = await Consultation.findOne({ _id: id, expert: expertId }).lean();
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });
  if (doc.status !== "in_progress")
    throw Object.assign(new Error("Chat only available during active session"), { status: 400 });

  const msg = await ConsultationMessage.create({ consultation: id, sender: expertId, message, messageType, attachments });
  const populated = await msg.populate("sender", "name avatar role");

  await invalidate(expertId, id);
  await addTimeline(id, "message_sent", `Expert sent a ${messageType} message`, expertId);

  const io = getSocketServer();
  if (io) {
    io.to(`consultation:${id}`).emit("consultation_message", {
      consultationId: id,
      message: populated,
      emittedAt: new Date().toISOString()
    });
  }

  return populated;
};

/* ── Mark messages read ──────────────────────────────────────────────────── */
export const markMessagesRead = async (id, expertId) => {
  await ConsultationMessage.updateMany(
    { consultation: id, sender: { $ne: expertId }, read: false },
    { $set: { read: true } }
  );
  const io = getSocketServer();
  if (io) io.to(`consultation:${id}`).emit("messages_read", { consultationId: id, readBy: String(expertId) });
  return { ok: true };
};

/* ── Recommendation ──────────────────────────────────────────────────────── */
export const saveRecommendation = async (id, expertId, body) => {
  const doc = await Consultation.findOne({ _id: id, expert: expertId }).lean();
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });

  const rec = await ConsultationRecommendation.findOneAndUpdate(
    { consultation: id, expert: expertId },
    { ...body, consultation: id, expert: expertId },
    { upsert: true, new: true }
  );

  await invalidate(expertId, id);
  await addTimeline(id, "recommendation_added", "Expert added a recommendation", expertId);

  emit(`consultation:${id}`, "recommendation_added", { consultationId: id });
  emit(`user:${String(doc.user)}`, "recommendation_added", { consultationId: id });

  return rec;
};

/* ── Timeline ────────────────────────────────────────────────────────────── */
export const fetchTimeline = (id) =>
  getOrSetCache(`timeline_${id}`, CACHE_TTL, async () =>
    TimelineEvent.find({ consultation: id })
      .populate("actor", "name role")
      .sort({ createdAt: 1 })
      .lean()
  );

/* ── AI Insights (store on consultation) ─────────────────────────────────── */
export const saveAIInsights = async (id, expertId, insights) => {
  const doc = await Consultation.findOneAndUpdate(
    { _id: id, expert: expertId },
    { $set: { aiAnalysis: { ...insights, analyzedAt: new Date() } } },
    { new: true }
  ).lean();
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });

  await invalidate(expertId, id);
  await addTimeline(id, "ai_analysis", "AI analysis triggered and results stored", expertId, insights);

  emit(`consultation:${id}`, "ai_insights_updated", { consultationId: id, insights });

  return doc.aiAnalysis;
};
