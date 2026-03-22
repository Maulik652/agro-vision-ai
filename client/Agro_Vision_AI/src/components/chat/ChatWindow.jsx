/**
 * ChatWindow — right panel showing messages for the active conversation.
 * Features: real avatars, reply-to, image lightbox, reactions, typing indicator.
 */
import { useEffect, useRef, useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, MessageSquare } from "lucide-react";

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
  const [replyTo, setReplyTo] = useState(null);

  const {
    messagesByConv, appendMessage, updateMessageStatus,
    addTyping, removeTyping, typingUsers, setMessages,
  } = useChatStore();

  const messages = messagesByConv[convId] ?? [];

  // Resolve the "other" participant for sender lookup
  const isBuyer = conversation?.buyer?._id === currentUserId || conversation?.buyer === currentUserId;
  const otherUser = isBuyer ? conversation?.farmer : conversation?.buyer;
  const meUser    = isBuyer ? conversation?.buyer  : conversation?.farmer;

  /* ── Fetch message history ──────────────────────────────── */
  const { isLoading, isError, refetch, data } = useQuery({
    queryKey: ["messages", convId],
    queryFn:  () => fetchMessages(convId),
    enabled:  !!convId,
    staleTime: 0,
  });

  useEffect(() => {
    if (data?.messages) setMessages(convId, data.messages);
  }, [data, convId, setMessages]);

  /* ── Socket events ───────────────────────────────────────── */
  useEffect(() => {
    if (!convId) return;
    const socket = getChatSocket();
    if (!socket) return;

    socket.emit("join_room", { conversationId: convId });
    markRead(convId).catch(() => {});
    socket.emit("message_read", { conversationId: convId });

    const onMessage = (msg) => {
      const msgConvId = String(msg.conversation ?? msg.conversationId ?? "");
      if (msgConvId && msgConvId !== convId) return;
      appendMessage(convId, msg);
      markRead(convId).catch(() => {});
      socket.emit("message_read", { conversationId: convId });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    };

    const onDelivered  = ({ messageId }) => updateMessageStatus(convId, messageId, "delivered");
    const onRead       = () => {
      useChatStore.getState().messagesByConv[convId]?.forEach((m) => {
        if (String(m.sender?._id ?? m.sender) === currentUserId) {
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

  /* ── Auto-scroll ─────────────────────────────────────────── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, typingUsers.size]);

  /* ── Send ────────────────────────────────────────────────── */
  const handleSend = useCallback((payload) => {
    const socket = getChatSocket();
    if (!socket || !convId) return;
    socket.emit("send_message", { conversationId: convId, ...payload });
  }, [convId]);

  const handleTyping     = useCallback(() => getChatSocket()?.emit("typing",      { conversationId: convId }), [convId]);
  const handleStopTyping = useCallback(() => getChatSocket()?.emit("stop_typing", { conversationId: convId }), [convId]);

  if (!conversation) return <EmptyChat />;

  // Group messages by date for date separators
  const grouped = [];
  let lastDate = null;
  for (const msg of messages) {
    const d = new Date(msg.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    if (d !== lastDate) {
      grouped.push({ type: "date", label: d });
      lastDate = d;
    }
    grouped.push({ type: "msg", msg });
  }

  return (
    <div className="flex flex-col h-full">
      <ChatHeader conversation={conversation} currentUserId={currentUserId} onBack={onBack} />
      <OrderContextBanner conversation={conversation} />

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto py-2 bg-gradient-to-b from-slate-50/60 to-white"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <RefreshCw size={20} className="text-slate-300 animate-spin" />
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-slate-400 text-sm">Failed to load messages</p>
            <button onClick={() => refetch()} className="text-green-700 text-xs font-semibold hover:underline">Retry</button>
          </div>
        )}

        {!isLoading && messages.length === 0 && !isError && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center">
              <MessageSquare size={24} className="text-green-600" />
            </div>
            <p className="text-slate-500 text-sm font-medium">No messages yet</p>
            <p className="text-slate-400 text-xs">Send a message to start the conversation</p>
          </div>
        )}

        {!isLoading && grouped.map((item, i) => {
          if (item.type === "date") {
            return (
              <div key={`date-${i}`} className="flex items-center gap-3 px-4 py-2">
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-[10px] text-slate-400 font-medium bg-white px-2 py-0.5 rounded-full border border-slate-100 shrink-0">
                  {item.label}
                </span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>
            );
          }
          const msg = item.msg;
          const isMine = String(msg.sender?._id ?? msg.sender) === currentUserId;
          const senderUser = isMine ? meUser : otherUser;
          return (
            <MessageBubble
              key={msg._id}
              message={msg}
              isMine={isMine}
              senderUser={senderUser}
              onReply={setReplyTo}
            />
          );
        })}

        {typingUsers.size > 0 && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      <MessageInput
        onSend={handleSend}
        onTyping={handleTyping}
        onStopTyping={handleStopTyping}
        disabled={!convId}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  );
}
