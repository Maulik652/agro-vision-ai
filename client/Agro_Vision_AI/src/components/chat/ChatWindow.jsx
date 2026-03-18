/**
 * ChatWindow — right panel showing messages for the active conversation.
 * Handles socket events: receive_message, typing, stop_typing, messages_read.
 */
import { useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

import { fetchMessages, markRead } from "../../services/chatAPI.js";
import { getChatSocket } from "../../services/chatSocket.js";
import useChatStore from "../../store/chatStore.js";

import ChatHeader         from "./ChatHeader.jsx";
import MessageBubble      from "./MessageBubble.jsx";
import MessageInput       from "./MessageInput.jsx";
import TypingIndicator    from "./TypingIndicator.jsx";
import OrderContextBanner from "./OrderContextBanner.jsx";
import EmptyChat          from "./EmptyChat.jsx";

export default function ChatWindow({ conversation, currentUserId, onBack }) {
  const convId    = conversation?._id;
  const qc        = useQueryClient();
  const bottomRef = useRef(null);

  const {
    messagesByConv, appendMessage, updateMessageStatus,
    addTyping, removeTyping, typingUsers,
    setMessages,
  } = useChatStore();

  const messages = messagesByConv[convId] ?? [];

  /* ── Fetch message history ──────────────────────────────── */
  const { isLoading, isError, refetch, data } = useQuery({
    queryKey: ["messages", convId],
    queryFn:  () => fetchMessages(convId),
    enabled:  !!convId,
    staleTime: 0,
  });

  // Sync fetched messages into store (replaces deprecated onSuccess)
  useEffect(() => {
    if (data?.messages) {
      setMessages(convId, data.messages);
    }
  }, [data, convId, setMessages]);

  /* ── Join socket room + bind events ─────────────────────── */
  useEffect(() => {
    if (!convId) return;
    const socket = getChatSocket();
    if (!socket) return;

    socket.emit("join_room", { conversationId: convId });
    markRead(convId).catch(() => {});
    socket.emit("message_read", { conversationId: convId });

    const onMessage = (msg) => {
      const msgConvId = String(msg.conversation ?? msg.conversationId ?? "");
      // Only handle messages for this conversation
      if (msgConvId && msgConvId !== convId) return;
      appendMessage(convId, msg);
      // Auto-mark read since window is open
      markRead(convId).catch(() => {});
      socket.emit("message_read", { conversationId: convId });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    };

    const onDelivered  = ({ messageId }) => updateMessageStatus(convId, messageId, "delivered");
    const onRead       = () => {
      // Mark all my sent messages as read
      useChatStore.getState().messagesByConv[convId]?.forEach((m) => {
        if (String(m.sender) === currentUserId || String(m.sender?._id) === currentUserId) {
          updateMessageStatus(convId, m._id, "read");
        }
      });
    };
    const onTyping     = ({ userId }) => { if (userId !== currentUserId) addTyping(userId); };
    const onStopTyping = ({ userId }) => removeTyping(userId);

    socket.on("receive_message",   onMessage);
    socket.on("message_delivered", onDelivered);
    socket.on("messages_read",     onRead);
    socket.on("typing",            onTyping);
    socket.on("stop_typing",       onStopTyping);

    return () => {
      socket.off("receive_message",   onMessage);
      socket.off("message_delivered", onDelivered);
      socket.off("messages_read",     onRead);
      socket.off("typing",            onTyping);
      socket.off("stop_typing",       onStopTyping);
    };
  }, [convId, currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Auto-scroll to bottom on new messages ──────────────── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, typingUsers.size]);

  /* ── Send message via socket ─────────────────────────────── */
  const handleSend = useCallback((payload) => {
    const socket = getChatSocket();
    if (!socket || !convId) return;
    socket.emit("send_message", { conversationId: convId, ...payload });
  }, [convId]);

  const handleTyping     = useCallback(() => {
    getChatSocket()?.emit("typing",      { conversationId: convId });
  }, [convId]);

  const handleStopTyping = useCallback(() => {
    getChatSocket()?.emit("stop_typing", { conversationId: convId });
  }, [convId]);

  /* ── No conversation selected ────────────────────────────── */
  if (!conversation) return <EmptyChat />;

  return (
    <div className="flex flex-col h-full">
      <ChatHeader conversation={conversation} currentUserId={currentUserId} onBack={onBack} />
      <OrderContextBanner conversation={conversation} />

      {/* Messages area — no scrollbar */}
      <div
        className="flex-1 overflow-y-auto py-3 bg-gradient-to-b from-slate-50 to-white"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <style>{`
          .chat-msgs-area::-webkit-scrollbar { display: none; }
        `}</style>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={20} className="text-slate-300 animate-spin" />
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <p className="text-slate-400 text-sm">Failed to load messages</p>
            <button
              onClick={() => refetch()}
              className="text-green-700 text-xs font-semibold hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && messages.map((msg) => (
          <MessageBubble
            key={msg._id}
            message={msg}
            isMine={String(msg.sender) === currentUserId || String(msg.sender?._id) === currentUserId}
          />
        ))}

        {typingUsers.size > 0 && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      <MessageInput
        onSend={handleSend}
        onTyping={handleTyping}
        onStopTyping={handleStopTyping}
        disabled={!convId}
      />
    </div>
  );
}
