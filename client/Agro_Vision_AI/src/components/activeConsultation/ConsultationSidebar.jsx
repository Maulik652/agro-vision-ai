import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, Loader2, MessageSquare, AlertTriangle, Clock, ChevronDown } from "lucide-react";
import { fetchActiveConsultations } from "../../api/consultationApi";
import { debounce } from "../../utils/debounce";

const STATUS_BADGE = {
  scheduled:   "bg-sky-100 text-sky-700",
  in_progress: "bg-emerald-100 text-emerald-700"
};
const PRIORITY_DOT = {
  urgent: "bg-red-500",
  high:   "bg-orange-400",
  medium: "bg-amber-400",
  low:    "bg-slate-300"
};
const CROPS = ["All", "Wheat", "Rice", "Tomato", "Cotton", "Maize", "Soybean", "Groundnut", "Sugarcane"];
const PRIORITIES = ["All", "urgent", "high", "medium", "low"];

export default function ConsultationSidebar({ selectedId, onSelect }) {
  const [search, setSearch]     = useState("");
  const [crop, setCrop]         = useState("");
  const [priority, setPriority] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debounceSearch = useCallback(debounce((v) => setDebouncedSearch(v), 350), []);

  const { data: consultations = [], isLoading } = useQuery({
    queryKey: ["active-consultations", debouncedSearch, crop, priority],
    queryFn: () => fetchActiveConsultations({
      search: debouncedSearch,
      crop: crop === "All" ? "" : crop,
      priority: priority === "All" ? "" : priority
    }),
    staleTime: 30_000,
    refetchInterval: 15_000
  });

  const handleSearch = (e) => {
    setSearch(e.target.value);
    debounceSearch(e.target.value);
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900">Active Sessions</h2>
          <div className="flex items-center gap-1">
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
              {consultations.length}
            </span>
            <button onClick={() => setShowFilters(v => !v)}
              className={`p-1.5 rounded-lg transition ${showFilters ? "bg-slate-100 text-slate-700" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}>
              <Filter size={14} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={handleSearch} placeholder="Search farmer, crop..."
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl pl-8 pr-3 py-2 text-xs outline-none focus:border-emerald-400 transition" />
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-2 space-y-2">
              <div>
                <p className="text-[10px] text-slate-400 mb-1">Crop</p>
                <div className="flex flex-wrap gap-1">
                  {CROPS.map((c) => (
                    <button key={c} onClick={() => setCrop(c === "All" ? "" : c)}
                      className={`px-2 py-0.5 rounded text-[10px] transition ${(crop === c || (!crop && c === "All")) ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 mb-1">Priority</p>
                <div className="flex flex-wrap gap-1">
                  {PRIORITIES.map((p) => (
                    <button key={p} onClick={() => setPriority(p === "All" ? "" : p)}
                      className={`px-2 py-0.5 rounded text-[10px] capitalize transition ${(priority === p || (!priority && p === "All")) ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-emerald-500" />
          </div>
        ) : consultations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <MessageSquare size={32} className="text-slate-300 mb-3" />
            <p className="text-slate-400 text-xs">No active consultations</p>
          </div>
        ) : (
          consultations.map((c) => (
            <SidebarItem key={c._id} consultation={c} isSelected={selectedId === c._id} onSelect={onSelect} />
          ))
        )}
      </div>
    </div>
  );
}

function SidebarItem({ consultation: c, isSelected, onSelect }) {
  const lastMsg = c.lastMessage?.message || c.lastMessage?.messageType === "image" ? "📷 Image" : "No messages yet";
  const timeAgo = c.lastMessage?.createdAt
    ? formatTimeAgo(new Date(c.lastMessage.createdAt))
    : formatTimeAgo(new Date(c.createdAt));

  return (
    <motion.button
      onClick={() => onSelect(c._id)}
      whileHover={{ x: 2 }}
      className={`w-full text-left px-4 py-3.5 border-b border-slate-50 transition-colors ${
        isSelected ? "bg-emerald-50 border-l-2 border-l-emerald-500" : "hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-sm font-bold overflow-hidden">
            {c.user?.avatar
              ? <img src={c.user.avatar} alt={c.user.name} className="w-full h-full object-cover" />
              : (c.user?.name?.[0] || "U").toUpperCase()
            }
          </div>
          <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
            c.status === "in_progress" ? "bg-emerald-500" : "bg-sky-400"
          }`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="text-xs font-semibold text-slate-900 truncate">{c.user?.name || "Unknown"}</span>
            <span className="text-[10px] text-slate-400 shrink-0">{timeAgo}</span>
          </div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[c.priority] || PRIORITY_DOT.medium}`} />
            <span className="text-[10px] text-slate-500 truncate">{c.cropType} · {c.problemCategory}</span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <p className="text-[10px] text-slate-400 truncate flex-1">
              {c.lastMessage?.message || "No messages yet"}
            </p>
            <div className="flex items-center gap-1 shrink-0">
              {c.unreadCount > 0 && (
                <span className="bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {c.unreadCount}
                </span>
              )}
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${STATUS_BADGE[c.status] || "bg-slate-100 text-slate-500"}`}>
                {c.status === "in_progress" ? "Live" : "Waiting"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

function formatTimeAgo(date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}
