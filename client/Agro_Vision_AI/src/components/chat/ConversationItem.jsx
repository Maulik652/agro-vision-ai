/**
 * ConversationItem — single row in the conversations list panel.
 */
import { motion } from "framer-motion";
import useChatStore from "../../store/chatStore.js";

const formatTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

export default function ConversationItem({ conversation, currentUserId, isActive, onClick }) {
  const { isOnline } = useChatStore();

  const isBuyer   = conversation.buyer?._id === currentUserId || conversation.buyer === currentUserId;
  const other     = isBuyer ? conversation.farmer : conversation.buyer;
  const otherId   = other?._id ?? other;
  const otherName = other?.name ?? "Unknown";
  const unread    = isBuyer ? conversation.unreadBuyer : conversation.unreadFarmer;
  const online    = isOnline(String(otherId));

  return (
    <motion.button
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all
        ${isActive
          ? "bg-green-50 border-r-2 border-green-600"
          : "hover:bg-slate-50 border-r-2 border-transparent"
        }`}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-sm">
          {otherName.charAt(0).toUpperCase()}
        </div>
        {online && (
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p className={`text-sm truncate ${isActive ? "text-green-800 font-semibold" : "text-slate-800 font-medium"}`}>
            {otherName}
          </p>
          <span className="text-[10px] text-slate-400 shrink-0 ml-2">
            {formatTime(conversation.lastMessageAt)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400 truncate max-w-[160px]">
            {conversation.lastMessage || "Start a conversation"}
          </p>
          {unread > 0 && (
            <span className="ml-2 min-w-[18px] h-[18px] px-1 rounded-full bg-green-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}
