import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { X, Send, Tag, MessageCircle } from "lucide-react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:5000";

export default function ChatPanel({ crop, onClose }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [offerMode, setOfferMode] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    const token = localStorage.getItem("token");
    socketRef.current = io(SOCKET_URL, { auth: { token } });
    socketRef.current.emit("start_chat", { cropId: crop.id, farmerId: crop.farmer?.id });
    socketRef.current.on("receive_message", (payload) => {
      if (payload.type === "history") setMessages(payload.messages ?? []);
      else if (payload.type === "message" || payload.type === "incoming")
        setMessages((prev) => [...prev, payload.message]);
    });
    return () => socketRef.current?.disconnect();
  }, [crop.id, crop.farmer?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = () => {
    if (!text.trim() && !offerMode) return;
    socketRef.current?.emit("send_message", {
      cropId: crop.id,
      farmerId: crop.farmer?.id,
      messageType: offerMode ? "offer" : "text",
      text: offerMode ? `Offer: ₹${offerAmount}/kg` : text,
      ...(offerMode && { offer: { amount: Number(offerAmount), quantity: crop.minOrderQty } }),
    });
    setText(""); setOfferAmount(""); setOfferMode(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.96 }}
      className="fixed right-6 bottom-6 z-50 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col overflow-hidden"
      style={{ height: 460 }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50">
        <div className="w-8 h-8 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-green-700 text-xs font-bold">
          {(crop.farmer?.name ?? "F")[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-slate-800 text-xs font-semibold truncate">{crop.farmer?.name ?? "Farmer"}</p>
          <p className="text-slate-400 text-[10px] truncate">{crop.cropName}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-green-600 text-[10px]">Online</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 ml-1"><X size={14} /></button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-white">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-300">
            <MessageCircle size={28} />
            <p className="text-xs">Start a conversation</p>
          </div>
        )}
        {messages.map((m, i) => {
          const isMe = m.fromUserId === user.id;
          return (
            <div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                isMe ? "bg-green-600 text-white rounded-br-sm" : "bg-slate-100 text-slate-700 rounded-bl-sm"
              }`}>
                {m.messageType === "offer" ? (
                  <span className="flex items-center gap-1 font-semibold">
                    <Tag size={10} /> {m.text}
                  </span>
                ) : m.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Offer input */}
      {offerMode && (
        <div className="px-3 pb-2 bg-white">
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <Tag size={12} className="text-amber-600 shrink-0" />
            <input type="number" placeholder={`Offer price (Farmer: ₹${crop.price})`}
              value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)}
              className="flex-1 bg-transparent text-slate-700 text-xs placeholder-slate-400 focus:outline-none" />
            <button onClick={() => setOfferMode(false)} className="text-slate-400"><X size={12} /></button>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="flex items-center gap-2 px-3 py-3 border-t border-slate-100 bg-white">
        <button onClick={() => setOfferMode(!offerMode)}
          className={`p-2 rounded-lg transition-all ${offerMode ? "bg-amber-50 text-amber-600 border border-amber-200" : "bg-slate-100 text-slate-400 hover:text-slate-600"}`}>
          <Tag size={13} />
        </button>
        <input value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type a message..."
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-xs placeholder-slate-400 focus:outline-none focus:border-green-400" />
        <button onClick={send}
          className="p-2 rounded-xl bg-green-700 hover:bg-green-800 text-white transition-all">
          <Send size={13} />
        </button>
      </div>
    </motion.div>
  );
}
