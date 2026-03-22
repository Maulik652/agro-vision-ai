/**
 * Chat REST API Service — AgroVision AI
 */
import api from "../api/axios.js";

const unwrap = (res) => res.data?.data ?? res.data;

/** POST /api/chat/start */
export const startConversation = (body) =>
  api.post("/chat/start", body).then(unwrap);

/** GET /api/chat/conversations */
export const fetchConversations = () =>
  api.get("/chat/conversations").then(unwrap);

/** GET /api/chat/messages/:conversationId?page=1&limit=30 */
export const fetchMessages = (conversationId, page = 1) =>
  api.get(`/chat/messages/${conversationId}`, { params: { page, limit: 30 } }).then(unwrap);

/** PUT /api/chat/read/:conversationId */
export const markRead = (conversationId) =>
  api.put(`/chat/read/${conversationId}`).then(unwrap);

/** GET /api/chat/unread */
export const fetchUnreadCount = () =>
  api.get("/chat/unread").then(unwrap);

/** POST /api/upload/chat-image — upload image file, returns { url } */
export const uploadChatImage = async (file) => {
  const form = new FormData();
  form.append("image", file);
  const res = await api.post("/upload/chat-image", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data; // { success, url }
};
