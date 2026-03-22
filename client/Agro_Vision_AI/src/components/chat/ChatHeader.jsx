import { ArrowLeft, Info, Phone } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useChatStore from "../../store/chatStore.js";
import ChatAvatar from "./ChatAvatar.jsx";

export default function ChatHeader({ conversation, currentUserId, onBack }) {
  const { isOnline } = useChatStore();
  const [showInfo, setShowInfo] = useState(false);

  if (!conversation) return null;

  const isBuyer   = conversation.buyer?._id === currentUserId || conversation.buyer === currentUserId;
  const other     = isBuyer ? conversation.farmer : conversation.buyer;
  const otherId   = String(other?._id ?? other ?? "");
  const otherName = other?.name ?? "Unknown";
  const online    = isOnline(otherId);

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-white shadow-sm shrink-0">
        {onBack && (
          <button onClick={onBack} className="text-slate-400 hover:text-slate-700 transition-colors md:hidden p-1">
            <ArrowLeft size={18} />
          </button>
        )}

        <ChatAvatar user={other} size={10} showOnline online={online} />

        <div className="flex-1 min-w-0">
          <p className="text-slate-800 font-semibold text-sm truncate">{otherName}</p>
          <div className="flex items-center gap-1.5">
            {online ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <p className="text-xs text-green-600 font-medium">Online</p>
              </>
            ) : (
              <p className="text-xs text-slate-400">Offline</p>
            )}
            {other?.city && (
              <span className="text-xs text-slate-300">· {other.city}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowInfo(v => !v)}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            title="View profile"
          >
            <Info size={16} />
          </button>
        </div>
      </div>

      {/* Info panel */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-b border-slate-100 bg-gradient-to-r from-green-50 to-emerald-50"
          >
            <div className="flex items-center gap-4 px-4 py-3">
              <ChatAvatar user={other} size={12} />
              <div>
                <p className="text-sm font-bold text-slate-800">{otherName}</p>
                <p className="text-xs text-slate-500 capitalize">{other?.role ?? "User"}</p>
                {other?.city && <p className="text-xs text-slate-400">{other.city}, {other.state}</p>}
              </div>
              <button
                onClick={() => setShowInfo(false)}
                className="ml-auto text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-white transition"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
