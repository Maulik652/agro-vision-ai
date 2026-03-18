import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import CropListing from "../models/CropListing.js";
import CropChatMessage from "../models/CropChatMessage.js";
import { registerChatNamespace } from "./chatNamespace.js";

let ioInstance = null;
const CHAT_HISTORY_LIMIT = 40;

const verifyOptions = {
  issuer: process.env.JWT_ISSUER || "agrovision-api",
  audience: process.env.JWT_AUDIENCE || "agrovision-client"
};

const extractSocketToken = (socket) => {
  const authToken = socket.handshake?.auth?.token;

  if (typeof authToken === "string" && authToken.trim()) {
    return authToken.trim();
  }

  const header = socket.handshake?.headers?.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.split(" ")[1];
  }

  return null;
};

const parseTokenPayload = (token) => {
  if (!token || !process.env.JWT_SECRET) {
    return null;
  }

  try {
    return jwt.verify(token, process.env.JWT_SECRET, verifyOptions);
  } catch {
    return null;
  }
};

const toSafeText = (value, maxLength = 2000) =>
  String(value || "")
    .trim()
    .slice(0, maxLength);

const toSafeNumber = (value, fallback = null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildConversationId = (cropId, firstUserId, secondUserId) => {
  const [left, right] = [String(firstUserId || ""), String(secondUserId || "")].sort();
  return `crop:${cropId}:${left}:${right}`;
};

const shapeMessagePayload = (message) => ({
  id: String(message._id),
  conversationId: String(message.conversationId),
  cropId: String(message.cropId),
  fromUserId: String(message.fromUserId),
  toUserId: String(message.toUserId),
  messageType: message.messageType,
  text: message.text || "",
  imageUrl: message.imageUrl || "",
  offer: {
    amount: toSafeNumber(message.offer?.amount, null),
    quantity: toSafeNumber(message.offer?.quantity, null),
    note: message.offer?.note || ""
  },
  createdAt: message.createdAt
});

const resolveChatParticipants = async ({ cropId, requesterId, targetUserId, farmerId }) => {
  if (!mongoose.Types.ObjectId.isValid(cropId)) {
    return null;
  }

  let resolvedTarget = String(targetUserId || farmerId || "").trim();

  if (!resolvedTarget) {
    const listing = await CropListing.findById(cropId).select("farmer").lean();
    resolvedTarget = String(listing?.farmer || "").trim();
  }

  if (!resolvedTarget || resolvedTarget === String(requesterId || "")) {
    return null;
  }

  const conversationId = buildConversationId(cropId, requesterId, resolvedTarget);

  return {
    cropId: String(cropId),
    targetUserId: resolvedTarget,
    conversationId
  };
};

export const initializeSocketServer = (httpServer, { allowedOrigins = [] } = {}) => {
  if (ioInstance) {
    return ioInstance;
  }

  ioInstance = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
      methods: ["GET", "POST"]
    }
  });

  // Register the dedicated buyer↔farmer chat namespace
  registerChatNamespace(ioInstance);

  ioInstance.use((socket, next) => {
    const token = extractSocketToken(socket);
    const payload = parseTokenPayload(token);

    if (!payload) {
      return next();
    }

    socket.data.user = {
      id: String(payload.id || ""),
      role: String(payload.role || "").toLowerCase()
    };

    return next();
  });

  ioInstance.on("connection", (socket) => {
    const userId = socket.data?.user?.id;
    const role = socket.data?.user?.role;

    /* Expert joins their personal room for consultation notifications */
    if (userId && role === "expert") {
      socket.join(`expert:${userId}`);
    }

    /* Join a consultation chat room */
    socket.on("join_consultation", ({ consultationId } = {}) => {
      if (consultationId) {
        socket.join(`consultation:${String(consultationId)}`);
      }
    });

    /* Typing indicators for consultation chat */
    socket.on("typing_start", ({ consultationId, userId: typingUserId } = {}) => {
      if (consultationId) {
        socket.to(`consultation:${String(consultationId)}`).emit("typing_start", {
          consultationId,
          userId: typingUserId || userId
        });
      }
    });

    socket.on("typing_stop", ({ consultationId, userId: typingUserId } = {}) => {
      if (consultationId) {
        socket.to(`consultation:${String(consultationId)}`).emit("typing_stop", {
          consultationId,
          userId: typingUserId || userId
        });
      }
    });

    if (userId) {
      socket.join(`user:${userId}`);
    }

    if (role === "buyer") {
      socket.join("buyers");
      socket.join("dashboard:buyers");

      if (userId) {
        socket.join(`dashboard:buyer:${userId}`);
      }
    }

    if (role === "farmer" && userId) {
      socket.join(`farmer:${userId}`);
    }

    socket.on("join_buyer_room", ({ userId: requestedUserId } = {}) => {
      if (userId && String(requestedUserId || "") === userId) {
        socket.join("buyers");
        socket.join("dashboard:buyers");
        socket.join(`buyer:${userId}`);
        socket.join(`dashboard:buyer:${userId}`);
      }
    });

    /**
     * subscribe_dashboard_events
     * Buyer dashboard clients join dedicated rooms for scoped real-time alerts.
     */
    socket.on("subscribe_dashboard_events", ({ userId: requestedUserId } = {}) => {
      if (userId && String(requestedUserId || "") === userId) {
        socket.join(`dashboard:buyer:${userId}`);
      }

      if (role === "buyer") {
        socket.join("dashboard:buyers");
      }
    });

    /**
     * start_chat
     * Initializes a buyer-farmer conversation room for a crop detail page.
     */
    socket.on("start_chat", async (payload = {}, ack) => {
      try {
        if (!userId) {
          socket.emit("receive_message", {
            type: "error",
            message: "Authentication required to start chat"
          });
          return;
        }

        const cropId = String(payload.cropId || "").trim();
        const participants = await resolveChatParticipants({
          cropId,
          requesterId: userId,
          targetUserId: payload.targetUserId,
          farmerId: payload.farmerId
        });

        if (!participants) {
          socket.emit("receive_message", {
            type: "error",
            message: "Unable to start chat for this crop"
          });
          return;
        }

        const room = `chat:${participants.conversationId}`;
        socket.join(room);

        const historyRows = await CropChatMessage.find({
          conversationId: participants.conversationId
        })
          .sort({ createdAt: -1 })
          .limit(CHAT_HISTORY_LIMIT)
          .lean();

        const history = historyRows.reverse().map(shapeMessagePayload);

        const historyPayload = {
          type: "history",
          conversationId: participants.conversationId,
          cropId: participants.cropId,
          participants: [userId, participants.targetUserId],
          messages: history
        };

        socket.emit("receive_message", historyPayload);

        ioInstance.to(`user:${participants.targetUserId}`).emit("receive_message", {
          type: "chat_started",
          conversationId: participants.conversationId,
          cropId: participants.cropId,
          fromUserId: userId
        });

        if (typeof ack === "function") {
          ack({ success: true, ...historyPayload });
        }
      } catch (error) {
        socket.emit("receive_message", {
          type: "error",
          message: "Failed to initialize chat"
        });

        if (typeof ack === "function") {
          ack({ success: false, message: error.message });
        }
      }
    });

    /**
     * send_message
     * Supports messageType text | image | offer for negotiation workflows.
     */
    socket.on("send_message", async (payload = {}, ack) => {
      try {
        if (!userId) {
          socket.emit("receive_message", {
            type: "error",
            message: "Authentication required to send message"
          });
          return;
        }

        const cropId = String(payload.cropId || "").trim();
        const participants = await resolveChatParticipants({
          cropId,
          requesterId: userId,
          targetUserId: payload.targetUserId,
          farmerId: payload.farmerId
        });

        if (!participants) {
          socket.emit("receive_message", {
            type: "error",
            message: "Unable to resolve chat participants"
          });
          return;
        }

        const messageType = ["text", "image", "offer"].includes(String(payload.messageType || ""))
          ? String(payload.messageType)
          : "text";

        const text = toSafeText(payload.text, 2000);
        const imageUrl = toSafeText(payload.imageUrl, 2000);
        const offerAmount = toSafeNumber(payload.offer?.amount, null);
        const offerQuantity = toSafeNumber(payload.offer?.quantity, null);
        const offerNote = toSafeText(payload.offer?.note, 300);

        if (messageType === "text" && !text) {
          socket.emit("receive_message", {
            type: "error",
            message: "Text message cannot be empty"
          });
          return;
        }

        if (messageType === "image" && !imageUrl) {
          socket.emit("receive_message", {
            type: "error",
            message: "Image URL is required for image messages"
          });
          return;
        }

        if (messageType === "offer" && offerAmount == null) {
          socket.emit("receive_message", {
            type: "error",
            message: "Offer amount is required for offer negotiation"
          });
          return;
        }

        const created = await CropChatMessage.create({
          conversationId: participants.conversationId,
          cropId,
          fromUserId: userId,
          toUserId: participants.targetUserId,
          messageType,
          text,
          imageUrl,
          offer: {
            amount: offerAmount,
            quantity: offerQuantity,
            note: offerNote
          }
        });

        const messagePayload = {
          type: "message",
          conversationId: participants.conversationId,
          cropId,
          message: shapeMessagePayload(created)
        };

        const room = `chat:${participants.conversationId}`;
        ioInstance.to(room).emit("receive_message", messagePayload);
        ioInstance.to(`user:${participants.targetUserId}`).emit("receive_message", {
          type: "incoming",
          conversationId: participants.conversationId,
          cropId,
          message: shapeMessagePayload(created)
        });

        ioInstance.to(`user:${participants.targetUserId}`).emit("new_message", {
          conversationId: participants.conversationId,
          cropId,
          fromUserId: userId,
          message: shapeMessagePayload(created),
          emittedAt: new Date().toISOString()
        });

        if (typeof ack === "function") {
          ack({ success: true, ...messagePayload });
        }
      } catch (error) {
        socket.emit("receive_message", {
          type: "error",
          message: "Failed to send message"
        });

        if (typeof ack === "function") {
          ack({ success: false, message: error.message });
        }
      }
    });
  });

  return ioInstance;
};

export const getSocketServer = () => ioInstance;

export const emitNewCropListing = (listing) => {
  if (!ioInstance) {
    return;
  }

  ioInstance.to("buyers").emit("new_crop_listing", {
    listing,
    emittedAt: new Date().toISOString()
  });

  ioInstance.to("dashboard:buyers").emit("new_crop_listing", {
    listing,
    emittedAt: new Date().toISOString()
  });
};

/**
 * Broadcast a crop price change to all connected buyer clients.
 * Triggered by sellers when they update their listing price.
 */
export const emitCropPriceUpdate = (cropId, priceData) => {
  if (!ioInstance) {
    return;
  }

  ioInstance.to("buyers").emit("crop_price_update", {
    cropId: String(cropId),
    priceData,
    emittedAt: new Date().toISOString()
  });
};

export const emitToRoom = (room, event, payload) => {
  if (!ioInstance) {
    return;
  }

  ioInstance.to(room).emit(event, payload);
};

/**
 * emitDashboardEvent
 * Centralized helper for buyer dashboard events:
 * - order_update
 * - new_crop_listing
 * - price_drop_alert
 * - new_message
 */
export const emitDashboardEvent = ({ eventName, payload, buyerId }) => {
  if (!ioInstance) {
    return;
  }

  const safeEvent = String(eventName || "").trim();

  if (!safeEvent) {
    return;
  }

  const eventPayload = {
    ...(payload || {}),
    emittedAt: new Date().toISOString()
  };

  if (buyerId) {
    ioInstance.to(`dashboard:buyer:${String(buyerId)}`).emit(safeEvent, eventPayload);
    return;
  }

  ioInstance.to("dashboard:buyers").emit(safeEvent, eventPayload);
};

export const emitOrderUpdate = ({ buyerId, order }) => {
  emitDashboardEvent({
    eventName: "order_update",
    payload: { order },
    buyerId
  });
};

export const emitPriceDropAlert = ({ buyerId, crop }) => {
  emitDashboardEvent({
    eventName: "price_drop_alert",
    payload: { crop },
    buyerId
  });
};

/**
 * emitStockUpdate
 * Broadcasts real-time stock changes to all connected buyers.
 * @param {string} cropId
 * @param {number} newQuantity  — remaining stock after order
 * @param {boolean} outOfStock  — true when quantity reaches 0
 */
export const emitStockUpdate = (cropId, newQuantity, outOfStock = false) => {
  if (!ioInstance) return;
  const payload = {
    cropId: String(cropId),
    quantity: newQuantity,
    outOfStock,
    emittedAt: new Date().toISOString(),
  };
  // Broadcast to all buyers (marketplace page)
  ioInstance.to("buyers").emit("stock_update", payload);
  // Also broadcast globally so CropDetail pages pick it up
  ioInstance.emit("stock_update", payload);
};

/**
 * emitInventoryUpdate
 * Notifies the farmer's private room that their inventory has changed.
 * Triggered on: stock deduction (order), pause, unpause, status change.
 * @param {string} farmerId
 * @param {object} payload  — { cropId, cropName, quantity, status, event }
 */
export const emitInventoryUpdate = (farmerId, payload = {}) => {
  if (!ioInstance || !farmerId) return;
  ioInstance.to(`farmer:${String(farmerId)}`).emit("inventory_update", {
    ...payload,
    emittedAt: new Date().toISOString(),
  });
};
