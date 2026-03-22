import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, CheckCheck, Package, X, Reply, SmilePlus } from "lucide-react";
import ChatAvatar from "./ChatAvatar.jsx";

const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

const formatCurrency = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const QUICK_REACTIONS = ["👍", "❤️", "😊", "🌾", "✅", "🙏"];

function DeliveryIcon({ status }) {
  if (status === "read")      return <CheckCheck size={11} className="text-blue-400" />;
  if (status === "delivered") return <CheckCheck size={11} className="text-slate-400" />;
  return <Check size={11} className="text-slate-300" />;
}

/* ── Image Lightbox ─────────────────────────────────────────── */
function Lightbox({ src, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
      >
        <X size={18} />
      </button>
      <motion.img
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        src={src}
        alt="Full size"
        className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </motion.div>
  );
}

export default function MessageBubble({ message, isMine, onReply, senderUser }) {
  const { messageType, text, imageUrl, orderRef, deliveryStatus, createdAt, sender } = message;
  const [lightbox, setLightbox]     = useState(false);
  const [showReact, setShowReact]   = useState(false);
  const [reaction, setReaction]     = useState(null);
  const [hovered, setHovered]       = useState(false);

  // Resolve sender user object — from populated field or passed prop
  const resolvedSender = (typeof sender === "object" && sender !== null) ? sender : senderUser;

  const handleReaction = (emoji) => {
    setReaction(prev => prev === emoji ? null : emoji);
    setShowReact(false);
  };

  return (
    <>
      <AnimatePresence>
        {lightbox && imageUrl && (
          <Lightbox src={imageUrl} onClose={() => setLightbox(false)} />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setShowReact(false); }}
        className={`flex items-end gap-2 px-3 py-1 group ${isMine ? "flex-row-reverse" : "flex-row"}`}
      >
        {/* Avatar */}
        <div className="shrink-0 mb-1">
          <ChatAvatar user={resolvedSender} size={8} />
        </div>

        <div className={`max-w-[72%] flex flex-col gap-0.5 ${isMine ? "items-end" : "items-start"}`}>

          {/* Sender name (only for received messages) */}
          {!isMine && resolvedSender?.name && (
            <p className="text-[10px] text-slate-400 px-1 font-medium">{resolvedSender.name}</p>
          )}

          {/* Bubble wrapper with hover actions */}
          <div className={`relative flex items-end gap-1.5 ${isMine ? "flex-row-reverse" : "flex-row"}`}>

            {/* Hover actions */}
            <AnimatePresence>
              {hovered && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={`flex items-center gap-1 mb-1 ${isMine ? "flex-row-reverse" : "flex-row"}`}
                >
                  {onReply && (
                    <button
                      onClick={() => onReply(message)}
                      className="w-7 h-7 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 hover:text-green-700 hover:border-green-300 transition"
                      title="Reply"
                    >
                      <Reply size={12} />
                    </button>
                  )}
                  <div className="relative">
                    <button
                      onClick={() => setShowReact(v => !v)}
                      className="w-7 h-7 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 hover:text-amber-500 hover:border-amber-300 transition"
                      title="React"
                    >
                      <SmilePlus size={12} />
                    </button>
                    <AnimatePresence>
                      {showReact && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.9 }}
                          className={`absolute bottom-full mb-1 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 flex gap-1 z-20 ${isMine ? "right-0" : "left-0"}`}
                        >
                          {QUICK_REACTIONS.map(e => (
                            <button
                              key={e}
                              onClick={() => handleReaction(e)}
                              className={`text-lg w-8 h-8 rounded-xl flex items-center justify-center hover:bg-slate-100 transition ${reaction === e ? "bg-amber-50 ring-1 ring-amber-300" : ""}`}
                            >
                              {e}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* The actual bubble */}
            <div>
              {/* Text message */}
              {messageType === "text" && (
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm
                  ${isMine
                    ? "bg-gradient-to-br from-green-600 to-emerald-700 text-white rounded-br-sm"
                    : "bg-white border border-slate-100 text-slate-800 rounded-bl-sm"
                  }`}
                >
                  {text}
                </div>
              )}

              {/* Image message */}
              {messageType === "image" && imageUrl && (
                <div
                  className={`rounded-2xl overflow-hidden shadow-sm border cursor-pointer hover:opacity-95 transition
                    ${isMine ? "border-green-500/30 rounded-br-sm" : "border-slate-100 rounded-bl-sm"}`}
                  onClick={() => setLightbox(true)}
                  title="Click to enlarge"
                >
                  <img
                    src={imageUrl}
                    alt="Shared image"
                    loading="lazy"
                    className="max-w-[240px] max-h-[240px] w-full object-cover block"
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                  <div className={`px-3 py-1.5 text-[10px] font-medium ${isMine ? "bg-green-700/80 text-green-100" : "bg-slate-50 text-slate-400"}`}>
                    📷 Tap to view full size
                  </div>
                </div>
              )}

              {/* Order reference */}
              {messageType === "order_reference" && orderRef && (
                <div className={`rounded-2xl border px-4 py-3 shadow-sm text-sm min-w-[200px]
                  ${isMine
                    ? "bg-gradient-to-br from-green-600 to-emerald-700 border-green-500/30 text-white rounded-br-sm"
                    : "bg-white border-slate-100 text-slate-800 rounded-bl-sm"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2 opacity-80">
                    <Package size={13} />
                    <span className="text-xs font-bold uppercase tracking-wide">Order Reference</span>
                  </div>
                  {orderRef.orderId    && <p className="font-semibold text-sm">#{orderRef.orderId}</p>}
                  {orderRef.cropName   && <p className="text-xs opacity-80 mt-0.5">Crop: {orderRef.cropName}</p>}
                  {orderRef.quantity   && <p className="text-xs opacity-80">Qty: {orderRef.quantity} kg</p>}
                  {orderRef.totalAmount && (
                    <p className="text-xs opacity-80">Total: {formatCurrency(orderRef.totalAmount)}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Reaction badge */}
          {reaction && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={() => setReaction(null)}
              className={`text-base -mt-1 px-1.5 py-0.5 rounded-full bg-white border border-slate-200 shadow-sm ${isMine ? "self-end" : "self-start"}`}
              title="Remove reaction"
            >
              {reaction}
            </motion.button>
          )}

          {/* Timestamp + delivery */}
          <div className={`flex items-center gap-1 text-[10px] text-slate-400 px-1 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
            <span>{formatTime(createdAt)}</span>
            {isMine && <DeliveryIcon status={deliveryStatus} />}
          </div>
        </div>
      </motion.div>
    </>
  );
}
