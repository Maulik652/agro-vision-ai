/**
 * Chat Controller — AgroVision AI
 * REST endpoints for conversation management.
 * Real-time messaging is handled by the Socket.IO chat namespace.
 */
import * as svc from "../services/chatService.js";

const err = (res, e) => res.status(e.status ?? 500).json({ success: false, message: e.message });

/** POST /api/chat/start */
export const startConversation = async (req, res) => {
  try {
    const buyerId = req.user._id.toString();
    if (req.user.role !== "buyer") {
      return res.status(403).json({ success: false, message: "Only buyers can start conversations" });
    }
    const data = await svc.startConversation(buyerId, req.validatedBody);
    res.status(201).json({ success: true, data });
  } catch (e) { err(res, e); }
};

/** GET /api/chat/conversations */
export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const role   = req.user.role;
    const data   = await svc.getConversations(userId, role);
    res.json({ success: true, data });
  } catch (e) { err(res, e); }
};

/** GET /api/chat/messages/:conversationId */
export const getMessages = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { conversationId } = req.params;
    const { page, limit }    = req.validatedQuery ?? { page: 1, limit: 30 };
    const data = await svc.getMessages(conversationId, userId, { page, limit });
    res.json({ success: true, data });
  } catch (e) { err(res, e); }
};

/** PUT /api/chat/read/:conversationId */
export const markRead = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    await svc.markConversationRead(req.params.conversationId, userId);
    res.json({ success: true });
  } catch (e) { err(res, e); }
};

/** GET /api/chat/unread */
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const role   = req.user.role;
    const count  = await svc.getUnreadCount(userId, role);
    res.json({ success: true, data: { count } });
  } catch (e) { err(res, e); }
};
