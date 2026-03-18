import { motion } from "framer-motion";
import { Check, CheckCheck, Package } from "lucide-react";

const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

const formatCurrency = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

function DeliveryIcon({ status }) {
  if (status === "read")      return <CheckCheck size={12} className="text-blue-400" />;
  if (status === "delivered") return <CheckCheck size={12} className="text-slate-400" />;
  return <Check size={12} className="text-slate-300" />;
}

export default function MessageBubble({ message, isMine }) {
  const { messageType, text, imageUrl, orderRef, deliveryStatus, createdAt } = message;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-end gap-2 px-4 py-1 ${isMine ? "flex-row-reverse" : "flex-row"}`}
    >
      <div className={`w-6 h-6 rounded-full shrink-0 ${isMine ? "bg-green-200" : "bg-slate-200"}`} />

      <div className={`max-w-[72%] ${isMine ? "items-end" : "items-start"} flex flex-col gap-0.5`}>

        {/* Text message */}
        {messageType === "text" && (
          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm
            ${isMine
              ? "bg-green-700 text-white rounded-br-sm"
              : "bg-white border border-slate-100 text-slate-800 rounded-bl-sm"
            }`}
          >
            {text}
          </div>
        )}

        {/* Image message — shown for both sender and receiver */}
        {messageType === "image" && imageUrl && (
          <div className={`rounded-2xl overflow-hidden shadow-sm border
            ${isMine ? "border-green-600 rounded-br-sm" : "border-slate-100 rounded-bl-sm"}`}
          >
            <img
              src={imageUrl}
              alt="Shared image"
              loading="lazy"
              className="max-w-[220px] max-h-[220px] object-cover block"
              onError={(e) => { e.target.style.display = "none"; }}
            />
          </div>
        )}

        {/* Order reference message */}
        {messageType === "order_reference" && orderRef && (
          <div className={`rounded-2xl border px-4 py-3 shadow-sm text-sm
            ${isMine
              ? "bg-green-700 border-green-600 text-white rounded-br-sm"
              : "bg-white border-slate-100 text-slate-800 rounded-bl-sm"
            }`}
          >
            <div className="flex items-center gap-2 mb-2 opacity-80">
              <Package size={13} />
              <span className="text-xs font-semibold uppercase tracking-wide">Order Reference</span>
            </div>
            {orderRef.orderId    && <p className="font-semibold">#{orderRef.orderId}</p>}
            {orderRef.cropName   && <p className="text-xs opacity-80">Crop: {orderRef.cropName}</p>}
            {orderRef.quantity   && <p className="text-xs opacity-80">Qty: {orderRef.quantity} kg</p>}
            {orderRef.totalAmount && (
              <p className="text-xs opacity-80">Total: {formatCurrency(orderRef.totalAmount)}</p>
            )}
          </div>
        )}

        {/* Timestamp + delivery status */}
        <div className={`flex items-center gap-1 text-[10px] text-slate-400 px-1
          ${isMine ? "flex-row-reverse" : "flex-row"}`}
        >
          <span>{formatTime(createdAt)}</span>
          {isMine && <DeliveryIcon status={deliveryStatus} />}
        </div>
      </div>
    </motion.div>
  );
}
