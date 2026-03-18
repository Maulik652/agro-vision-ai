/**
 * ConversationList — left panel showing all conversations with search.
 */
import { useState } from "react";
import { Search, MessageSquarePlus } from "lucide-react";
import ConversationItem from "./ConversationItem.jsx";

export default function ConversationList({
  conversations = [],
  currentUserId,
  activeId,
  onSelect,
  isLoading,
}) {
  const [query, setQuery] = useState("");

  const filtered = conversations.filter((c) => {
    if (!query.trim()) return true;
    const other = c.buyer?._id === currentUserId ? c.farmer : c.buyer;
    return other?.name?.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full border-r border-slate-100">
      {/* Header */}
      <div className="px-4 py-4 border-b border-slate-100">
        <h2 className="text-slate-800 font-bold text-base mb-3">Messages</h2>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {isLoading ? (
          <div className="space-y-1 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-slate-200 rounded w-3/4" />
                  <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <MessageSquarePlus size={32} className="text-slate-300 mb-3" />
            <p className="text-slate-400 text-sm">
              {query ? "No conversations found" : "No conversations yet"}
            </p>
          </div>
        ) : (
          filtered.map((conv) => (
            <ConversationItem
              key={conv._id}
              conversation={conv}
              currentUserId={currentUserId}
              isActive={conv._id === activeId}
              onClick={() => onSelect(conv)}
            />
          ))
        )}
      </div>
    </div>
  );
}
