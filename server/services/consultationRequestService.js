import Consultation from "../models/Consultation.js";
import ConsultationMessage from "../models/ConsultationMessage.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { getOrSetCache, deleteCache } from "../config/redis.js";
import { getSocketServer } from "../realtime/socketServer.js";

const CACHE_TTL = 120;

const invalidateUserCache = async (userId) => {
  await Promise.all([
    deleteCache(`user_consultations_${userId}`),
    deleteCache(`user_consultations_history_${userId}`),
  ]);
};

const emit = (event, payload) => {
  const io = getSocketServer();
  if (!io) return;
  const { expertId, userId } = payload;
  const ts = { emittedAt: new Date().toISOString() };
  if (userId)   io.to(`user:${userId}`).emit(event, { ...payload, ...ts });
  if (expertId) io.to(`user:${expertId}`).emit(event, { ...payload, ...ts });
};

/* ─── LIST AVAILABLE EXPERTS ─────────────────────────────────────────────── */
export const fetchExperts = async ({ search, specialization, sortBy } = {}) => {
  const filter = { role: "expert", isActive: { $ne: false }, status: { $ne: "suspended" } };

  if (specialization && specialization !== "all") {
    filter.specialization = { $regex: specialization, $options: "i" };
  }
  if (search) {
    filter.$or = [
      { name:           { $regex: search, $options: "i" } },
      { specialization: { $regex: search, $options: "i" } },
      { city:           { $regex: search, $options: "i" } },
      { expertTags:     { $in: [new RegExp(search, "i")] } },
    ];
  }

  const sortMap = {
    rating:  { rating: -1 },
    fee_low: { consultationFee: 1 },
    fee_high:{ consultationFee: -1 },
    newest:  { createdAt: -1 },
  };
  const sort = sortMap[sortBy] || { rating: -1 };

  const experts = await User.find(filter)
    .select("name avatar photo specialization consultationFee rating reviewCount city state isAvailable yearsExperience languages expertTags qualification experience")
    .sort(sort)
    .lean();

  // Normalize fields — use photo as avatar fallback, set defaults
  return experts.map(e => ({
    ...e,
    avatar:          e.avatar || e.photo || "",
    specialization:  e.specialization || e.qualification || "Agriculture Expert",
    consultationFee: e.consultationFee ?? 500,
    rating:          e.rating ?? 0,
    reviewCount:     e.reviewCount ?? 0,
    isAvailable:     e.isAvailable !== false,
    yearsExperience: e.yearsExperience || e.experience || 0,
  }));
};

/* ─── CREATE CONSULTATION REQUEST ────────────────────────────────────────── */
export const createConsultationRequest = async (userId, body) => {
  const {
    expertId,
    cropType,
    problemCategory,
    description,
    images = [],
    aiAnalysis = null,
    consultationType,
    schedule = null,
    consultationFee = 0,
    paymentId = null,
    paymentStatus = "pending",
    farmLocation = {},
    priority = "medium",
  } = body;

  // Auto-assign expert if not provided
  let resolvedExpertId = expertId;
  if (!resolvedExpertId) {
    const expert = await User.findOne({ role: "expert", isActive: { $ne: false }, status: { $ne: "suspended" } })
      .sort({ rating: -1 })
      .select("_id")
      .lean();
    if (!expert) throw Object.assign(new Error("No experts available"), { status: 503 });
    resolvedExpertId = expert._id;
  } else {
    // Verify the selected expert exists and is active
    const expert = await User.findOne({ _id: resolvedExpertId, role: "expert", isActive: { $ne: false } })
      .select("_id")
      .lean();
    if (!expert) throw Object.assign(new Error("Selected expert not found or unavailable"), { status: 404 });
  }

  // Get requester info for notification
  const requester = await User.findById(userId).select("name role").lean();
  const requesterLabel = requester?.role === "buyer" ? "buyer" : "farmer";

  const consultation = await Consultation.create({
    user: userId,
    expert: resolvedExpertId,
    cropType,
    problemCategory: problemCategory || "general",
    description,
    images,
    aiAnalysis,
    scheduledMeeting: schedule
      ? {
          date: schedule.date,
          time: schedule.time,
          meetingType: consultationType || "chat",
          meetingLink: schedule.meetingLink || "",
          notes: schedule.notes || "",
        }
      : null,
    consultationFee,
    paymentStatus,
    paymentId,
    farmLocation,
    priority,
    status: "pending",
  });

  await invalidateUserCache(userId);

  // Notify expert
  await Notification.create({
    user: resolvedExpertId,
    type: "system",
    title: "New Consultation Request",
    message: `You have a new consultation request for ${cropType} from a ${requesterLabel}${requester?.name ? ` (${requester.name})` : ""}.`,
    priority: "high",
    data: { consultationId: consultation._id },
  });

  emit("consultation_created", {
    userId: String(userId),
    expertId: String(resolvedExpertId),
    consultationId: String(consultation._id),
    cropType,
  });

  return consultation;
};

/* ─── MY CONSULTATIONS ───────────────────────────────────────────────────── */
export const fetchMyConsultations = (userId, { status, page = 1, limit = 20 } = {}) => {
  const cacheKey = `user_consultations_${userId}_${status || "all"}_${page}`;
  return getOrSetCache(cacheKey, CACHE_TTL, async () => {
    const filter = { user: userId };
    if (status) filter.status = status;

    const [docs, total] = await Promise.all([
      Consultation.find(filter)
        .populate("expert", "name avatar specialization consultationFee rating city state")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Consultation.countDocuments(filter),
    ]);

    return { consultations: docs, total, page, pages: Math.ceil(total / limit) };
  });
};

/* ─── SINGLE CONSULTATION ────────────────────────────────────────────────── */
export const fetchMyConsultationById = async (id, userId) => {
  const doc = await Consultation.findOne({ _id: id, user: userId })
    .populate("expert", "name avatar specialization consultationFee rating city state phone email")
    .lean();
  if (!doc) throw Object.assign(new Error("Consultation not found"), { status: 404 });
  return doc;
};

/* ─── MESSAGES (user side) ───────────────────────────────────────────────── */
export const fetchUserMessages = async (consultationId, userId) => {
  const doc = await Consultation.findOne({ _id: consultationId, user: userId }).lean();
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });

  return ConsultationMessage.find({ consultation: consultationId })
    .populate("sender", "name avatar role")
    .sort({ createdAt: 1 })
    .lean();
};

export const sendUserMessage = async (consultationId, senderId, { message, messageType = "text", attachments = [] }) => {
  const doc = await Consultation.findOne({ _id: consultationId, user: senderId }).lean();
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });

  const msg = await ConsultationMessage.create({
    consultation: consultationId,
    sender: senderId,
    message,
    messageType,
    attachments,
  });

  const populated = await msg.populate("sender", "name avatar role");

  const io = getSocketServer();
  if (io) {
    io.to(`consultation:${consultationId}`).emit("consultation_message", {
      consultationId,
      message: populated,
      emittedAt: new Date().toISOString(),
    });
  }

  return populated;
};

/* ─── PAY FOR CONSULTATION ───────────────────────────────────────────────── */
export const payConsultation = async (consultationId, userId, { paymentId, paymentGateway = "razorpay" }) => {
  const doc = await Consultation.findOne({ _id: consultationId, user: userId });
  if (!doc) throw Object.assign(new Error("Consultation not found"), { status: 404 });
  if (doc.paymentStatus === "paid") throw Object.assign(new Error("Already paid"), { status: 400 });

  doc.paymentStatus = "paid";
  doc.paymentId     = paymentId || `manual_${Date.now()}`;
  await doc.save();
  await invalidateUserCache(userId);

  emit("consultation_paid", {
    userId:         String(userId),
    expertId:       String(doc.expert),
    consultationId: String(doc._id),
    amount:         doc.consultationFee,
  });

  return { paid: true, consultationId: doc._id, amount: doc.consultationFee };
};

/* ─── GET PENDING PAYMENT CONSULTATIONS ─────────────────────────────────── */
export const fetchPendingPayments = (userId) =>
  Consultation.find({ user: userId, paymentStatus: "pending", consultationFee: { $gt: 0 } })
    .populate("expert", "name avatar specialization consultationFee city")
    .sort({ createdAt: -1 })
    .lean();
