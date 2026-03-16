/**
 * FarmerChatPage — /farmer/chat
 * Farmers receive and respond to buyer messages.
 * Same two-panel layout as buyer chat.
 */
import { useState } from "react";
import { MessageSquare } from "lucide-react";

import { useAuth }    from "../../context/AuthContext";
import useChatSetup   from "../../hooks/useChatSetup.js";
import useChatStore   from "../../store/chatStore.js";

import ConversationList from "../../components/chat/ConversationList.jsx";
import ChatWindow       from "../../components/chat/ChatWindow.jsx";
import EmptyChat        from "../../components/chat/EmptyChat.jsx";

export default function FarmerChatPage() {
  const { user }   = useAuth();
  const { setActiveConversation } = useChatStore();

  const { conversations, isLoading } = useChatSetup(user);

  const [activeConv, setActiveConv] = useState(null);
  const [mobileView, setMobileView] = useState("list");

  const handleSelect = (conv) => {
    setActiveConv(conv);
    setActiveConversation(conv._id);
    setMobileView("chat");
  };

  const currentUserId = user?._id ?? user?.id ?? "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef]">
      {/* Page header */}
      <div className="bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center">
            <MessageSquare size={16} className="text-green-700" />
          </div>
          <div>
            <h1 className="text-slate-900 font-bold text-base">Buyer Messages</h1>
            <p className="text-slate-400 text-xs">Respond to buyers about your crops</p>
          </div>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
          style={{ height: "calc(100vh - 180px)" }}
        >
          <div className="flex h-full">
            {/* Left panel */}
            <div className={`w-full md:w-80 lg:w-96 shrink-0 h-full
              ${mobileView === "chat" ? "hidden md:flex md:flex-col" : "flex flex-col"}`}
            >
              <ConversationList
                conversations={conversations}
                currentUserId={currentUserId}
                activeId={activeConv?._id}
                onSelect={handleSelect}
                isLoading={isLoading}
              />
            </div>

            {/* Right panel */}
            <div className={`flex-1 h-full
              ${mobileView === "list" ? "hidden md:flex md:flex-col" : "flex flex-col"}`}
            >
              {activeConv ? (
                <ChatWindow
                  conversation={activeConv}
                  currentUserId={currentUserId}
                  onBack={() => setMobileView("list")}
                />
              ) : (
                <EmptyChat message="Select a conversation to reply to a buyer." />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
