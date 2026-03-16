import { ArrowLeft } from "lucide-react";
import useChatStore from "../../store/chatStore.js";

export default function ChatHeader({ conversation, currentUserId, onBack }) {
  const { isOnline } = useChatStore();

  if (!conversation) return null;

  const isBuyer   = conversation.buyer?._id === currentUserId || conversation.buyer === currentUserId;
  const other     = isBuyer ? conversation.farmer : conversation.buyer;
  const otherId   = String(other?._id ?? other ?? "");
  const otherName = other?.name ?? "Unknown";
  const online    = isOnline(otherId);

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-white">
      {onBack && (
        <button onClick={onBack} className="text-slate-400 hover:text-slate-700 transition-colors md:hidden">
          <ArrowLeft size={18} />
        </button>
      )}
      <div className="relative">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-sm">
          {otherName.charAt(0).toUpperCase()}
        </div>
        {online && (
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white" />
        )}
      </div>
      <div>
        <p className="text-slate-800 font-semibold text-sm">{otherName}</p>
        <p className={`text-xs ${online ? "text-green-600" : "text-slate-400"}`}>
          {online ? "Online" : "Offline"}
        </p>
      </div>
    </div>
  );
}
