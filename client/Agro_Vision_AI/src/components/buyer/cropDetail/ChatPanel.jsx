/**
 * ChatPanel — floating chat widget on CropDetail page.
 * Uses the /chat Socket.IO namespace (same as the full chat pages).
 * Supports text, image (base64 preview), and offer messages.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { X, Send, Tag, MessageCircle, ImagePlus, Smile } from "lucide-react";
import { connectChatSocket, getChatSocket } from "../../../services/chatSocket.js";
import { startConversation } from "../../../services/chatAPI.js";

const EMOJI_LIST = ["😊", "👍", "🌾", "🌿", "✅", "🚜", "💰", "📦", "🙏", "❓"];

const formatTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "";

export default function ChatPanel({ crop, onClose }) {
  const [messages, setMessages]     = useState([]);
  const [text, setText]             = useState("");
  const [offerMode, setOfferMode]   = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [convId, setConvId]         = useState(null);
  const [loading, setLoading]       = useState(true);
  const [showEmoji, setShowEmoji]   = useState(false);
  const bottomRef  = useRef(null);
  const fileRef    = useRef(null);
  const convIdRef  = useRef(null);

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  })();
  const currentUserId = user._id ?? user.id ?? "";

  /* ── Connect socket + start conversation ─────────────────── */
  useEffect(() => {
    if (!crop?.id && !crop?._id) return;
    const token = localStorage.getItem("token");

    // Ensure /chat namespace socket is connected
    const socket = connectChatSocket(token);

    const init = async () => {
      try {
        // Start or retrieve conversation via REST
        const conv = await startConversation({
          farmerId: crop.farmer?.id ?? crop.farmer?._id,
          cropId:   crop.id ?? crop._id,
          cropName: crop.cropName,
        });
        const cid = conv._id ?? conv.id;
        setConvId(cid);
        convIdRef.current = cid;

        // Join the conversation room
        socket.emit("join_room", { conversationId: cid });
      } catch (e) {
        console.error("ChatPanel init error", e);
      } finally {
        setLoading(false);
      }
    };

    init();

    /* ── Receive messages ──────────────────────────────────── */
    const onMessage = (msg) => {
      const cid = convIdRef.current;
      if (!cid) return;
      const msgConvId = String(msg.conversation ?? msg.conversationId ?? "");
      if (msgConvId && msgConvId !== cid) return;
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    };

    socket.on("receive_message", onMessage);

    return () => {
      socket.off("receive_message", onMessage);
      // Don't disconnect — shared socket used by full chat pages too
    };
  }, [crop?.id, crop?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Auto-scroll ─────────────────────────────────────────── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  /* ── Send message ────────────────────────────────────────── */
  const send = useCallback((payload) => {
    const socket = getChatSocket();
    if (!socket || !convId) return;
    socket.emit("send_message", { conversationId: convId, ...payload });
  }, [convId]);

  const handleSend = () => {
    if (offerMode) {
      if (!offerAmount) return;
      send({
        messageType: "text",
        text: `💰 Offer: ₹${offerAmount}/kg for ${crop.cropName}`,
      });
      setOfferAmount(""); setOfferMode(false);
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) return;
    send({ messageType: "text", text: trimmed });
    setText("");
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      send({ messageType: "image", imageUrl: reader.result });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.96 }}
      className="fixed right-6 bottom-6 z-50 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col overflow-hidden"
      style={{ height: 460 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50 shrink-0">
        <div className="w-8 h-8 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-green-700 text-xs font-bold">
          {(crop.farmer?.name ?? "F")[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-slate-800 text-xs font-semibold truncate">{crop.farmer?.name ?? "Farmer"}</p>
          <p className="text-slate-400 text-[10px] truncate">{crop.cropName}</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 ml-1">
          <X size={14} />
        </button>
      </div>

      {/* Messages */}
      <div
        className="flex-1 p-3 space-y-2 bg-white overflow-y-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <style>{`.chat-panel-msgs::-webkit-scrollbar{display:none}`}</style>
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-300">
            <MessageCircle size={28} />
            <p className="text-xs">Start a conversation</p>
          </div>
        )}
        {messages.map((m, i) => {
          const isMe = String(m.sender ?? m.fromUserId) === currentUserId;
          return (
            <div key={m._id ?? i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-xl text-xs leading-relaxed overflow-hidden ${
                isMe
                  ? "bg-green-600 text-white rounded-br-sm"
                  : "bg-slate-100 text-slate-700 rounded-bl-sm"
              }`}>
                {m.messageType === "image" && m.imageUrl ? (
                  <img
                    src={m.imageUrl}
                    alt="Shared"
                    className="max-w-[200px] max-h-[180px] object-cover block"
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                ) : (
                  <p className="px-3 py-2">{m.text}</p>
                )}
                <p className={`text-[9px] px-3 pb-1.5 ${isMe ? "text-green-200 text-right" : "text-slate-400"}`}>
                  {formatTime(m.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Offer input */}
      {offerMode && (
        <div className="px-3 pb-2 bg-white shrink-0">
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <Tag size={12} className="text-amber-600 shrink-0" />
            <input
              type="number"
              placeholder={`Offer price (Listed: ₹${crop.price})`}
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="flex-1 bg-transparent text-slate-700 text-xs placeholder-slate-400 focus:outline-none"
            />
            <button onClick={() => setOfferMode(false)} className="text-slate-400"><X size={12} /></button>
          </div>
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && (
        <div className="absolute bottom-16 left-3 bg-white border border-slate-200 rounded-xl shadow-lg p-2 flex flex-wrap gap-1 w-48 z-10">
          {EMOJI_LIST.map((e) => (
            <button key={e} onClick={() => { setText((t) => t + e); setShowEmoji(false); }}
              className="text-base hover:bg-slate-100 rounded p-1 transition-colors">
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 border-t border-slate-100 bg-white shrink-0">
        <button onClick={() => setOfferMode(!offerMode)}
          className={`p-1.5 rounded-lg transition-all shrink-0 ${offerMode ? "bg-amber-50 text-amber-600 border border-amber-200" : "text-slate-400 hover:text-slate-600"}`}>
          <Tag size={13} />
        </button>
        <button onClick={() => setShowEmoji((v) => !v)}
          className="p-1.5 text-slate-400 hover:text-green-600 transition-colors shrink-0">
          <Smile size={13} />
        </button>
        <button onClick={() => fileRef.current?.click()}
          className="p-1.5 text-slate-400 hover:text-green-600 transition-colors shrink-0">
          <ImagePlus size={13} />
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message..."
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-xs placeholder-slate-400 focus:outline-none focus:border-green-400 min-w-0"
        />
        <button
          onClick={handleSend}
          disabled={!convId || (!text.trim() && !offerAmount)}
          className="p-2 rounded-xl bg-green-700 hover:bg-green-800 text-white transition-all disabled:opacity-40 shrink-0"
        >
          <Send size={13} />
        </button>
      </div>
    </motion.div>
  );
}
