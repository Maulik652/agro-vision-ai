import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { Send, Loader2, Paperclip, Image as ImageIcon, Smile, ChevronDown } from "lucide-react";
import { fetchActiveMessages, sendActiveMessage, markActiveMessagesRead } from "../../api/consultationApi";
import MessageBubble from "./MessageBubble";
import toast from "react-hot-toast";

const resolveSocketUrl = () => {
  const url = String(import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL || "").trim();
  return url ? url.replace(/\/api\/?$/, "") : "http://localhost:5000";
};

const QUICK_REPLIES = [
  "Could you share a photo of the affected area?",
  "How long has this issue been present?",
  "Have you applied any treatment recently?",
  "What is the current weather in your area?",
  "I'll analyze this and get back to you shortly."
];

export default function ChatWindow({ consultationId, consultation, userId }) {
  const qc = useQueryClient();
  const bottomRef = useRef(null);
  const socketRef = useRef(null);
  const inputRef  = useRef(null);
  const [text, setText]           = useState("");
  const [messages, setMessages]   = useState([]);
  const [typing, setTyping]       = useState(false);
  const [isTyping, setIsTyping]   = useState(false); // remote typing
  const [showQuick, setShowQuick] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const typingTimer = useRef(null);

  const canChat = consultation?.status === "in_progress";

  const { data, isLoading } = useQuery({
    queryKey: ["active-messages", consultationId],
    queryFn: () => fetchActiveMessages(consultationId),
    enabled: !!consultationId,
    staleTime: 20_000,
    onSuccess: (d) => {
      setMessages(Array.isArray(d?.messages) ? d.messages : Array.isArray(d) ? d : []);
    }
  });

  useEffect(() => {
    if (data) setMessages(Array.isArray(data?.messages) ? data.messages : Array.isArray(data) ? data : []);
  }, [data]);

  // Socket.IO
  useEffect(() => {
    if (!consultationId) return;
    const token = localStorage.getItem("token");
    const socket = io(resolveSocketUrl(), {
      transports: ["websocket"],
      withCredentials: true,
      auth: token ? { token } : undefined
    });
    socketRef.current = socket;
    socket.emit("join_consultation", { consultationId });

    socket.on("consultation_message", ({ message }) => {
      if (String(message?.consultation) === String(consultationId) ||
          String(message?.consultation?._id) === String(consultationId)) {
        setMessages((prev) => {
          const exists = prev.some((m) => String(m._id) === String(message._id));
          return exists ? prev : [...prev, message];
        });
      }
    });

    socket.on("typing_start", ({ consultationId: cid, userId: uid }) => {
      if (String(cid) === String(consultationId) && String(uid) !== String(userId)) setIsTyping(true);
    });
    socket.on("typing_stop", ({ consultationId: cid, userId: uid }) => {
      if (String(cid) === String(consultationId) && String(uid) !== String(userId)) setIsTyping(false);
    });
    socket.on("messages_read", ({ consultationId: cid }) => {
      if (String(cid) === String(consultationId)) {
        setMessages((prev) => prev.map((m) => ({ ...m, read: true })));
      }
    });

    return () => socket.disconnect();
  }, [consultationId, userId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Mark read on open
  useEffect(() => {
    if (consultationId) markActiveMessagesRead(consultationId).catch(() => {});
  }, [consultationId]);

  const handleScroll = (e) => {
    const el = e.currentTarget;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 200);
  };

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: "smooth" });

  const handleTyping = (e) => {
    setText(e.target.value);
    if (!typing) {
      setTyping(true);
      socketRef.current?.emit("typing_start", { consultationId, userId });
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      setTyping(false);
      socketRef.current?.emit("typing_stop", { consultationId, userId });
    }, 1500);
  };

  const sendMut = useMutation({
    mutationFn: (body) => sendActiveMessage(consultationId, body),
    onSuccess: (msg) => {
      setText("");
      setShowQuick(false);
      if (msg) setMessages((prev) => {
        const exists = prev.some((m) => String(m._id) === String(msg._id));
        return exists ? prev : [...prev, msg];
      });
      qc.invalidateQueries({ queryKey: ["active-consultations"] });
    },
    onError: (e) => toast.error(e?.response?.data?.message || "Failed to send")
  });

  const handleSend = (e) => {
    e?.preventDefault();
    if (!text.trim() || !canChat) return;
    sendMut.mutate({ message: text.trim(), messageType: "text" });
    clearTimeout(typingTimer.current);
    setTyping(false);
    socketRef.current?.emit("typing_stop", { consultationId, userId });
  };

  const handleQuickReply = (reply) => {
    if (!canChat) return;
    sendMut.mutate({ message: reply, messageType: "text" });
  };

  if (!consultationId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-400">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <Send size={28} className="text-slate-300" />
        </div>
        <p className="text-sm font-medium">Select a consultation to start</p>
        <p className="text-xs mt-1">Choose from the sidebar to open a session</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat header */}
      <div className="px-5 py-3.5 border-b border-slate-100 bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-sm font-bold overflow-hidden">
            {consultation?.user?.avatar
              ? <img src={consultation.user.avatar} alt="" className="w-full h-full object-cover" />
              : (consultation?.user?.name?.[0] || "U").toUpperCase()
            }
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{consultation?.user?.name || "Farmer"}</p>
            <p className="text-[10px] text-slate-400">{consultation?.cropType} · {consultation?.problemCategory}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center gap-1 text-xs text-slate-400">
              <span>typing</span>
              <span className="flex gap-0.5">
                {[0,1,2].map(i => (
                  <motion.span key={i} className="w-1 h-1 rounded-full bg-slate-400"
                    animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, delay: i * 0.15, duration: 0.6 }} />
                ))}
              </span>
            </motion.div>
          )}
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            canChat ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"
          }`}>
            {canChat ? "● Live" : "Waiting"}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 relative" onScroll={handleScroll}>
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-emerald-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
            <p className="text-sm">No messages yet.</p>
            {canChat && <p className="text-xs">Start the conversation below.</p>}
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg._id}
              msg={msg}
              isOwn={String(msg.sender?._id || msg.sender) === String(userId)}
            />
          ))
        )}

        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-500 shrink-0">
                {(consultation?.user?.name?.[0] || "U").toUpperCase()}
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-2.5 flex gap-1 shadow-sm">
                {[0,1,2].map(i => (
                  <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400"
                    animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, delay: i * 0.15, duration: 0.6 }} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />

        {/* Scroll to bottom */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              onClick={scrollToBottom}
              className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-500 hover:text-slate-700 transition">
              <ChevronDown size={16} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Quick replies */}
      <AnimatePresence>
        {showQuick && canChat && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-slate-100 bg-slate-50 px-4 py-2">
            <p className="text-[10px] text-slate-400 mb-2">Quick replies</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_REPLIES.map((r) => (
                <button key={r} onClick={() => handleQuickReply(r)}
                  className="text-xs px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-700 transition">
                  {r}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="px-4 py-3 border-t border-slate-100 bg-white">
        {!canChat && (
          <p className="text-xs text-center text-slate-400 mb-2">
            {consultation?.status === "scheduled" ? "Start the session to enable chat" : "Session ended"}
          </p>
        )}
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <button type="button" onClick={() => setShowQuick(v => !v)} disabled={!canChat}
            className="p-2 rounded-xl text-slate-400 hover:text-slateald-600 hover:bg-slate-100 disabled:opacity-30 transition">
            <Smile size={18} />
          </button>
          <input
            ref={inputRef}
            value={text}
            onChange={handleTyping}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend(e)}
            placeholder={canChat ? "Type a message..." : "Chat unavailable"}
            disabled={!canChat}
            className="flex-1 bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-400 transition disabled:opacity-50"
          />
          <button type="submit" disabled={!text.trim() || !canChat || sendMut.isPending}
            className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white transition shrink-0">
            {sendMut.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
}
