/**
 * Chat Namespace — /chat
 * Handles real-time buyer ↔ farmer messaging via Socket.IO.
 *
 * Architecture:
 * - Dedicated /chat namespace keeps chat events isolated from dashboard events.
 * - Each conversation gets its own room: `conv:<conversationId>`
 * - Online presence tracked in memory map (userId → socketId).
 *   For multi-server scaling, replace with Redis pub/sub adapter.
 * - All socket events are authenticated via JWT middleware on the namespace.
 * - Messages are persisted to MongoDB via chatService before broadcasting.
 */
import jwt from "jsonwebtoken";
import Conversation from "../models/Conversation.js";
import { saveMessage, markConversationRead } from "../services/chatService.js";

const verifyOptions = {
  issuer:   process.env.JWT_ISSUER   || "agrovision-api",
  audience: process.env.JWT_AUDIENCE || "agrovision-client",
};

// In-memory online presence: userId → Set<socketId>
// Replace with Redis SET for horizontal scaling
const onlineUsers = new Map();

const setOnline  = (userId, socketId) => {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socketId);
};
const setOffline = (userId, socketId) => {
  onlineUsers.get(userId)?.delete(socketId);
  if (onlineUsers.get(userId)?.size === 0) onlineUsers.delete(userId);
};
const isOnline   = (userId) => (onlineUsers.get(userId)?.size ?? 0) > 0;

/* ── JWT auth middleware for /chat namespace ─────────────────── */
const authMiddleware = (socket, next) => {
  const token =
    socket.handshake?.auth?.token ||
    socket.handshake?.headers?.authorization?.replace("Bearer ", "");

  if (!token || !process.env.JWT_SECRET) {
    return next(new Error("Authentication required"));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, verifyOptions);
    socket.data.userId = String(payload.id);
    socket.data.role   = String(payload.role || "").toLowerCase();
    return next();
  } catch {
    return next(new Error("Invalid or expired token"));
  }
};

/* ── Register namespace on the io instance ───────────────────── */
export const registerChatNamespace = (io) => {
  const chat = io.of("/chat");
  chat.use(authMiddleware);

  chat.on("connection", (socket) => {
    const { userId, role } = socket.data;

    // Track online presence
    setOnline(userId, socket.id);
    socket.join(`user:${userId}`);

    // Broadcast online status to all sockets in user's conversations
    socket.broadcast.emit("user_online", { userId });

    /* ── join_room ─────────────────────────────────────────────
     * Client joins a conversation room to receive messages.
     * Validates the user is a participant before joining.
     */
    socket.on("join_room", async ({ conversationId } = {}, ack) => {
      try {
        if (!conversationId) return ack?.({ success: false, message: "conversationId required" });

        const conv = await Conversation.findById(conversationId).lean();
        if (!conv) return ack?.({ success: false, message: "Conversation not found" });

        const isParticipant =
          conv.buyer.toString()  === userId ||
          conv.farmer.toString() === userId;
        if (!isParticipant) return ack?.({ success: false, message: "Access denied" });

        socket.join(`conv:${conversationId}`);

        // Tell sender whether the other participant is online
        const otherId = conv.buyer.toString() === userId
          ? conv.farmer.toString()
          : conv.buyer.toString();

        ack?.({ success: true, otherOnline: isOnline(otherId) });
      } catch (e) {
        ack?.({ success: false, message: e.message });
      }
    });

    /* ── send_message ──────────────────────────────────────────
     * Persist message to MongoDB, then broadcast to room.
     * Emits `receive_message` to all sockets in the conversation room.
     * Also emits `new_message` to the receiver's personal room for
     * notification badges outside the active conversation.
     */
    socket.on("send_message", async (payload = {}, ack) => {
      try {
        const { conversationId, messageType = "text", text, imageUrl, orderRef } = payload;
        if (!conversationId) return ack?.({ success: false, message: "conversationId required" });

        // Validate participant
        const conv = await Conversation.findById(conversationId).lean();
        if (!conv) return ack?.({ success: false, message: "Conversation not found" });

        const isParticipant =
          conv.buyer.toString()  === userId ||
          conv.farmer.toString() === userId;
        if (!isParticipant) return ack?.({ success: false, message: "Access denied" });

        if (messageType === "text" && !String(text || "").trim()) {
          return ack?.({ success: false, message: "Message text is required" });
        }

        const receiverId = conv.buyer.toString() === userId
          ? conv.farmer.toString()
          : conv.buyer.toString();

        // Persist to MongoDB + update conversation metadata
        const msg = await saveMessage(conversationId, userId, receiverId, {
          messageType,
          text: String(text || "").trim().slice(0, 2000),
          imageUrl: imageUrl || "",
          orderRef,
        });

        const msgPayload = {
          _id:            msg._id,
          conversation:   conversationId,
          sender:         userId,
          receiver:       receiverId,
          messageType:    msg.messageType,
          text:           msg.text,
          imageUrl:       msg.imageUrl,
          orderRef:       msg.orderRef,
          deliveryStatus: msg.deliveryStatus,
          createdAt:      msg.createdAt,
        };

        // Broadcast to everyone in the conversation room (sender + receiver)
        chat.to(`conv:${conversationId}`).emit("receive_message", msgPayload);

        // Notify receiver's personal room for unread badge updates
        chat.to(`user:${receiverId}`).emit("new_message", {
          conversationId,
          message: msgPayload,
        });

        // Mark as delivered if receiver is online in this room
        if (isOnline(receiverId)) {
          await msg.updateOne({ deliveryStatus: "delivered" });
          chat.to(`conv:${conversationId}`).emit("message_delivered", {
            messageId: msg._id,
            conversationId,
          });
        }

        ack?.({ success: true, message: msgPayload });
      } catch (e) {
        ack?.({ success: false, message: e.message });
      }
    });

    /* ── typing / stop_typing ──────────────────────────────────
     * Lightweight presence events — not persisted.
     */
    socket.on("typing", ({ conversationId } = {}) => {
      if (conversationId) {
        socket.to(`conv:${conversationId}`).emit("typing", { userId, conversationId });
      }
    });

    socket.on("stop_typing", ({ conversationId } = {}) => {
      if (conversationId) {
        socket.to(`conv:${conversationId}`).emit("stop_typing", { userId, conversationId });
      }
    });

    /* ── message_read ──────────────────────────────────────────
     * Client signals they've read all messages in a conversation.
     * Updates DB and notifies the sender of read receipts.
     */
    socket.on("message_read", async ({ conversationId } = {}, ack) => {
      try {
        if (!conversationId) return ack?.({ success: false });
        await markConversationRead(conversationId, userId);

        // Notify the other participant that messages were read
        socket.to(`conv:${conversationId}`).emit("messages_read", {
          conversationId,
          readBy: userId,
        });

        ack?.({ success: true });
      } catch (e) {
        ack?.({ success: false, message: e.message });
      }
    });

    /* ── disconnect ────────────────────────────────────────────*/
    socket.on("disconnect", () => {
      setOffline(userId, socket.id);
      if (!isOnline(userId)) {
        socket.broadcast.emit("user_offline", { userId });
      }
    });
  });

  return chat;
};

/** Check if a user is currently online (used by REST layer if needed) */
export const isUserOnline = (userId) => isOnline(String(userId));
