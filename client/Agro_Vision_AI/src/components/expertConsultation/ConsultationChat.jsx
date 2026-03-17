import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, MessageSquare, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { fetchConsultationMessages, sendConsultationMessage } from "../../api/consultationApi";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

const resolveSocketUrl = () => {
  const url = String(import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL || "").trim();
  return url ? url.replace(/\/api\/?$/, "") : "http://localhost:5000";
};

function ChatBubble({ msg, isOwn }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-3`}
    >
      {!isOwn && (
        <div className="w-7 h-7 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 text-xs font-bold mr-2 mt-1 shrink-0">
          {msg.sender?.name?.[0]?.toUpperCase() || "U"}
        </div>
      )}
      <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-1`}>
        {!isOwn && <p className="text-[10px] text-slate-400 px-1">{msg.sender?.name}</p>}
        {msg.messageType === "image" && msg.attachments?.[0]?.url ? (
          <img src={msg.attachments[0].url} alt="attachment" loading="lazy"
            className="max-w-full rounded-xl border border-slate-200 max-h-48 object-cover" />
        ) : (
          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isOwn
              ? "bg-emerald-500 text-white rounded-br-sm"
              : "bg-slate-100 text-slate-700 border border-slate-200 rounded-bl-sm"
          }`}>
            {msg.message}
          </div>
        )}
        <p className="text-[10px] text-slate-400 px-1">
          {new Date(msg.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </motion.div>
  );
}

export default function ConsultationChat({ consultationId, open, onClose }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const bottomRef = useRef(null);
  const socketRef = useRef(null);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);

  const { data: initialMessages, isLoading } = useQuery({
    queryKey: ["consultation-messages", consultationId],
    queryFn: () => fetchConsultationMessages(consultationId),
    enabled: !!consultationId && open,
    staleTime: 30_000
  });

  useEffect(() => {
    if (initialMessages) setMessages(Array.isArray(initialMessages) ? initialMessages : []);
  }, [initialMessages]);

  // Socket.IO real-time
  useEffect(() => {
    if (!consultationId || !open) return;
    const token = localStorage.getItem("token");
    const socket = io(resolveSocketUrl(), {
      transports: ["websocket"],
      withCredentials: true,
      auth: token ? { token } : undefined
    });
    socketRef.current = socket;

    socket.emit("join_consultation", { consultationId });

    socket.on("consultation_message", ({ message }) => {
      if (message?.consultation === consultationId || message?.consultation?._id === consultationId) {
        setMessages((prev) => {
          const exists = prev.some((m) => String(m._id) === String(message._id));
          return exists ? prev : [...prev, message];
        });
      }
    });

    return () => { socket.disconnect(); };
  }, [consultationId, open]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMut = useMutation({
    mutationFn: () => sendConsultationMessage(consultationId, { message: text.trim(), messageType: "text" }),
    onSuccess: (msg) => {
      setText("");
      if (msg) setMessages((prev) => [...prev, msg]);
    },
    onError: () => toast.error("Failed to send message")
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendMut.mutate();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="w-full max-w-lg h-[600px] bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-emerald-600" />
                <span className="text-slate-900 font-semibold text-sm">Consultation Chat</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition">
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="animate-spin text-emerald-500" size={24} />
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
                  <MessageSquare size={32} className="opacity-30" />
                  <p className="text-sm">No messages yet. Start the conversation.</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <ChatBubble
                    key={msg._id}
                    msg={msg}
                    isOwn={String(msg.sender?._id || msg.sender) === String(user?.id)}
                  />
                ))
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center gap-3">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-white border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-400 transition"
              />
              <button
                type="submit"
                disabled={!text.trim() || sendMut.isPending}
                className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white transition shrink-0"
              >
                {sendMut.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
