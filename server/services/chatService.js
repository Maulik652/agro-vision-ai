/**
 * Chat Service — AgroVision AI
 * Business logic for buyer ↔ farmer direct messaging.
 *
 * Architecture decisions:
 * - Conversations are unique per (buyer, farmer) pair — upserted on start.
 * - Unread counters are stored on the Conversation document for O(1) reads.
 * - Redis caches conversation lists (TTL 300s) and unread counts (TTL 300s).
 * - Cache is invalidated on new message and on mark-read.
 */
import Conversation from "../models/Conversation.js";
import Message      from "../models/Message.js";
import User         from "../models/User.js";
import { getCache, setCache, deleteCache } from "../config/redis.js";

const CONV_LIST_TTL  = 300; // 5 min
const UNREAD_TTL     = 300; // 5 min
const MSG_PAGE_LIMIT = 30;

/* ── Cache key helpers ───────────────────────────────────────── */
const convListKey  = (userId) => `chat_convs_${userId}`;
const unreadKey    = (userId) => `chat_unread_${userId}`;

/* ── Start or retrieve a conversation ───────────────────────── */
export const startConversation = async (buyerId, { farmerId, cropId, cropName, orderId }) => {
  // Validate farmer exists and has farmer role
  const farmer = await User.findOne({ _id: farmerId, role: "farmer" }).select("name").lean();
  if (!farmer) throw Object.assign(new Error("Farmer not found"), { status: 404 });

  const conv = await Conversation.findOneAndUpdate(
    { buyer: buyerId, farmer: farmerId },
    {
      $setOnInsert: {
        buyer: buyerId, farmer: farmerId,
        cropId: cropId ?? null,
        cropName: cropName ?? null,
        orderId: orderId ?? null,
      },
    },
    { upsert: true, new: true }
  ).populate("buyer farmer", "name role photo avatar city state");

  // Invalidate list caches for both participants
  await Promise.all([
    deleteCache(convListKey(buyerId)),
    deleteCache(convListKey(farmerId)),
  ]);

  return conv;
};

/* ── Get all conversations for a user ───────────────────────── */
export const getConversations = async (userId, role) => {
  const cacheKey = convListKey(userId);
  const cached   = await getCache(cacheKey);
  if (cached) return cached;

  const filter = role === "buyer" ? { buyer: userId } : { farmer: userId };

  const convs = await Conversation.find(filter)
    .sort({ lastMessageAt: -1 })
    .populate("buyer farmer", "name role photo avatar city state")
    .lean();

  await setCache(cacheKey, convs, CONV_LIST_TTL);
  return convs;
};

/* ── Get paginated messages for a conversation ───────────────── */
export const getMessages = async (conversationId, userId, { page = 1, limit = MSG_PAGE_LIMIT }) => {
  // Access control: user must be a participant
  const conv = await Conversation.findById(conversationId).lean();
  if (!conv) throw Object.assign(new Error("Conversation not found"), { status: 404 });

  const isParticipant =
    conv.buyer.toString()  === userId ||
    conv.farmer.toString() === userId;
  if (!isParticipant) throw Object.assign(new Error("Access denied"), { status: 403 });

  const skip = (page - 1) * limit;
  const [messages, total] = await Promise.all([
    Message.find({ conversation: conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("sender", "name photo avatar role")
      .lean(),
    Message.countDocuments({ conversation: conversationId }),
  ]);

  return {
    messages: messages.reverse(), // chronological order
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    conversation: conv,
  };
};

/* ── Save a message (called from socket handler) ─────────────── */
export const saveMessage = async (conversationId, senderId, receiverId, payload) => {
  const { messageType = "text", text = "", imageUrl = "", orderRef } = payload;

  const msg = await Message.create({
    conversation: conversationId,
    sender:   senderId,
    receiver: receiverId,
    messageType,
    text,
    imageUrl,
    orderRef: orderRef ?? {},
    deliveryStatus: "sent",
  });

  // Determine which unread counter to increment
  const conv = await Conversation.findById(conversationId).lean();
  const isSenderBuyer = conv.buyer.toString() === senderId;
  const unreadField   = isSenderBuyer ? "unreadFarmer" : "unreadBuyer";

  await Conversation.findByIdAndUpdate(conversationId, {
    $set: {
      lastMessage:   text || (messageType === "image" ? "📷 Image" : "📦 Order"),
      lastMessageAt: msg.createdAt,
      lastSenderId:  senderId,
    },
    $inc: { [unreadField]: 1 },
  });

  // Invalidate caches for both participants
  await Promise.all([
    deleteCache(convListKey(conv.buyer.toString())),
    deleteCache(convListKey(conv.farmer.toString())),
    deleteCache(unreadKey(receiverId)),
  ]);

  return msg;
};

/* ── Mark all messages in a conversation as read ─────────────── */
export const markConversationRead = async (conversationId, userId) => {
  const conv = await Conversation.findById(conversationId).lean();
  if (!conv) throw Object.assign(new Error("Conversation not found"), { status: 404 });

  const isBuyer = conv.buyer.toString() === userId;
  if (!isBuyer && conv.farmer.toString() !== userId) {
    throw Object.assign(new Error("Access denied"), { status: 403 });
  }

  // Mark unread messages sent TO this user as read
  await Message.updateMany(
    { conversation: conversationId, receiver: userId, deliveryStatus: { $ne: "read" } },
    { $set: { deliveryStatus: "read", readAt: new Date() } }
  );

  // Reset unread counter for this user
  const unreadField = isBuyer ? "unreadBuyer" : "unreadFarmer";
  await Conversation.findByIdAndUpdate(conversationId, { $set: { [unreadField]: 0 } });

  // Invalidate caches
  await Promise.all([
    deleteCache(convListKey(userId)),
    deleteCache(unreadKey(userId)),
  ]);
};

/* ── Get total unread count for a user ───────────────────────── */
export const getUnreadCount = async (userId, role) => {
  const cacheKey = unreadKey(userId);
  const cached   = await getCache(cacheKey);
  if (cached !== null) return cached;

  const filter = role === "buyer" ? { buyer: userId } : { farmer: userId };
  const field  = role === "buyer" ? "unreadBuyer" : "unreadFarmer";

  const result = await Conversation.aggregate([
    { $match: filter },
    { $group: { _id: null, total: { $sum: `$${field}` } } },
  ]);

  const count = result[0]?.total ?? 0;
  await setCache(cacheKey, count, UNREAD_TTL);
  return count;
};
