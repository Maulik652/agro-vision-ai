import { motion } from "framer-motion";
import { CheckCheck, Check, Image as ImageIcon, FileText } from "lucide-react";

export default function MessageBubble({ msg, isOwn }) {
  const time = new Date(msg.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-3 group`}
    >
      {!isOwn && (
        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold mr-2 mt-1 shrink-0 overflow-hidden">
          {msg.sender?.avatar
            ? <img src={msg.sender.avatar} alt={msg.sender.name} className="w-full h-full object-cover" />
            : (msg.sender?.name?.[0] || "U").toUpperCase()
          }
        </div>
      )}

      <div className={`max-w-[72%] flex flex-col ${isOwn ? "items-end" : "items-start"} gap-0.5`}>
        {!isOwn && (
          <p className="text-[10px] text-slate-400 px-1">{msg.sender?.name}</p>
        )}

        {msg.messageType === "image" && msg.attachments?.[0]?.url ? (
          <div className={`rounded-2xl overflow-hidden border ${isOwn ? "border-emerald-200 rounded-br-sm" : "border-slate-200 rounded-bl-sm"}`}>
            <img src={msg.attachments[0].url} alt="attachment" loading="lazy"
              className="max-w-full max-h-52 object-cover" />
          </div>
        ) : msg.messageType === "file" && msg.attachments?.[0] ? (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm ${
            isOwn ? "bg-emerald-500 text-white rounded-br-sm" : "bg-white border border-slate-200 text-slate-700 rounded-bl-sm"
          }`}>
            <FileText size={16} />
            <span className="truncate max-w-[160px]">{msg.attachments[0].name || "File"}</span>
          </div>
        ) : msg.messageType === "system" ? (
          <div className="px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-500 italic">
            {msg.message}
          </div>
        ) : (
          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isOwn
              ? "bg-emerald-500 text-white rounded-br-sm"
              : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm"
          }`}>
            {msg.message}
          </div>
        )}

        <div className={`flex items-center gap-1 px-1 ${isOwn ? "flex-row-reverse" : ""}`}>
          <p className="text-[10px] text-slate-400">{time}</p>
          {isOwn && (
            msg.read
              ? <CheckCheck size={11} className="text-emerald-400" />
              : <Check size={11} className="text-slate-300" />
          )}
        </div>
      </div>
    </motion.div>
  );
}
