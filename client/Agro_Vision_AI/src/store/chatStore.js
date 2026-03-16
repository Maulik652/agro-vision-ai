/**
 * Chat Store — Zustand
 * Owns all real-time chat UI state.
 * React Query handles REST fetches; this store handles socket-driven updates.
 */
import { create } from "zustand";

const useChatStore = create((set, get) => ({
  // Active conversation ID
  activeConversationId: null,

  // Messages keyed by conversationId: { [convId]: Message[] }
  messagesByConv: {},

  // Typing state: Set of userIds currently typing in active conv
  typingUsers: new Set(),

  // Online presence: Set of online userIds
  onlineUsers: new Set(),

  // Total unread count badge
  totalUnread: 0,

  /* ── Setters ─────────────────────────────────────────────── */
  setActiveConversation: (id) => set({ activeConversationId: id, typingUsers: new Set() }),

  setTotalUnread: (n) => set({ totalUnread: n }),

  /* ── Message management ──────────────────────────────────── */
  setMessages: (convId, messages) =>
    set((s) => ({ messagesByConv: { ...s.messagesByConv, [convId]: messages } })),

  appendMessage: (convId, msg) =>
    set((s) => {
      const existing = s.messagesByConv[convId] ?? [];
      // Deduplicate by _id
      if (existing.some((m) => m._id === msg._id)) return s;
      return { messagesByConv: { ...s.messagesByConv, [convId]: [...existing, msg] } };
    }),

  updateMessageStatus: (convId, messageId, deliveryStatus) =>
    set((s) => {
      const msgs = (s.messagesByConv[convId] ?? []).map((m) =>
        m._id === messageId ? { ...m, deliveryStatus } : m
      );
      return { messagesByConv: { ...s.messagesByConv, [convId]: msgs } };
    }),

  /* ── Typing ──────────────────────────────────────────────── */
  addTyping:    (userId) => set((s) => ({ typingUsers: new Set([...s.typingUsers, userId]) })),
  removeTyping: (userId) => set((s) => {
    const next = new Set(s.typingUsers);
    next.delete(userId);
    return { typingUsers: next };
  }),

  /* ── Online presence ─────────────────────────────────────── */
  setUserOnline:  (userId) => set((s) => ({ onlineUsers: new Set([...s.onlineUsers, userId]) })),
  setUserOffline: (userId) => set((s) => {
    const next = new Set(s.onlineUsers);
    next.delete(userId);
    return { onlineUsers: next };
  }),

  isOnline: (userId) => get().onlineUsers.has(userId),
}));

export default useChatStore;
