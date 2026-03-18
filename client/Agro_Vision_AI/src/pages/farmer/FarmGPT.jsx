import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Send, User, Loader2, Plus, Trash2, MessageSquare,
  Sprout, CloudSun, Bug, Droplets, FlaskConical, TrendingUp,
  Wheat, Leaf, Sparkles, History, AlertTriangle, X, Zap,
  ChevronRight, Mic, MicOff,
} from "lucide-react";
import { io as socketIO } from "socket.io-client";
import { useAuth } from "../../context/AuthContext";
import {
  sendFarmGPTMessage, getFarmGPTSessions,
  getFarmGPTSession, deleteFarmGPTSession,
} from "../../api/farmerApi";
import toast from "react-hot-toast";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

const QUICK_PROMPTS = [
  { icon: Bug,          label: "Pest Control",   prompt: "What pests should I watch for and how to control them?" },
  { icon: Droplets,     label: "Irrigation",      prompt: "When should I irrigate my crop next?" },
  { icon: FlaskConical, label: "Fertilizer",      prompt: "What fertilizer should I apply at this growth stage?" },
  { icon: CloudSun,     label: "Weather",         prompt: "Is it safe to spray pesticide today?" },
  { icon: TrendingUp,   label: "Market Price",    prompt: "When is the best time to sell my crop?" },
  { icon: Wheat,        label: "Harvest",         prompt: "Is my crop ready to harvest?" },
  { icon: Leaf,         label: "Disease",         prompt: "My leaves are turning yellow. What disease could this be?" },
  { icon: Sprout,       label: "Sowing",          prompt: "What should I prepare before sowing?" },
];

/* ── Markdown renderer ─────────────────────────────────────────────────── */
function MsgContent({ text }) {
  const lines = (text || "").split("\n");
  return (
    <div className="space-y-0.5 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (line.trim() === "") return <div key={i} className="h-2" />;
        const html = line
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.+?)\*/g, "<em>$1</em>");
        if (line.startsWith("• ") || line.startsWith("- ")) {
          return <li key={i} className="ml-4 list-disc" dangerouslySetInnerHTML={{ __html: html.slice(2) }} />;
        }
        if (/^\d+\./.test(line)) {
          return <li key={i} className="ml-4 list-decimal" dangerouslySetInnerHTML={{ __html: html }} />;
        }
        return <p key={i} dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </div>
  );
}

/* ── Typing dots ───────────────────────────────────────────────────────── */
function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map(i => (
        <motion.span key={i} className="w-2 h-2 rounded-full bg-green-500"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

/* ── Main component ────────────────────────────────────────────────────── */
export default function FarmGPT() {
  const { user } = useAuth();
  const [messages, setMessages]       = useState([]);
  const [streamingMsg, setStreamingMsg] = useState("");   // live streaming text
  const [isStreaming, setIsStreaming]  = useState(false);
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [sessionId, setSessionId]     = useState(null);
  const [sessions, setSessions]       = useState([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const chatEndRef  = useRef(null);
  const inputRef    = useRef(null);
  const socketRef   = useRef(null);
  const streamBuf   = useRef("");

  const farmContext = useMemo(() => ({
    crop:      user?.crops || "Wheat",
    city:      user?.city  || "",
    state:     user?.state || "",
    farmSize:  user?.farmSize || 2,
    soilType:  "loamy",
    sowingDate: null,
    season:    "rabi",
  }), [user]);

  /* ── Socket setup ──────────────────────────────────────────────────── */
  useEffect(() => {
    const token = document.cookie.split(";").find(c => c.trim().startsWith("av_access_token="))?.split("=")[1];
    const sock = socketIO(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket"],
      auth: token ? { token } : undefined,
    });
    socketRef.current = sock;

    sock.on("farmgpt_stream_chunk", ({ chunk }) => {
      streamBuf.current += chunk;
      setStreamingMsg(streamBuf.current);
    });

    sock.on("farmgpt_stream_end", ({ intent }) => {
      const finalText = streamBuf.current;
      streamBuf.current = "";
      setStreamingMsg("");
      setIsStreaming(false);
      setMessages(prev => [...prev, {
        role: "assistant", content: finalText, intent,
        disclaimer: "Advisory only — verify with your local agronomist for critical decisions.",
      }]);
    });

    return () => sock.disconnect();
  }, []);

  /* ── Auto-scroll ───────────────────────────────────────────────────── */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMsg, loading]);

  /* ── Load sessions ─────────────────────────────────────────────────── */
  useEffect(() => {
    getFarmGPTSessions()
      .then(d => { if (d.success) setSessions(d.sessions || []); })
      .catch(() => {});
  }, []);

  /* ── Send message ──────────────────────────────────────────────────── */
  const handleSend = useCallback(async (text) => {
    const question = (text || input).trim();
    if (!question || loading || isStreaming) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: question }]);
    setLoading(true);
    streamBuf.current = "";
    try {
      const data = await sendFarmGPTMessage(question, sessionId, farmContext);
      if (data.success) {
        if (data.sessionId && !sessionId) setSessionId(data.sessionId);
        // If socket streaming is active it will handle the message display.
        // Fallback: if stream_end never fires (no socket), show directly.
        setIsStreaming(true);
        // Safety fallback after 8s
        setTimeout(() => {
          if (streamBuf.current === "" && isStreaming) {
            setIsStreaming(false);
            setStreamingMsg("");
            setMessages(prev => [...prev, {
              role: "assistant", content: data.response, intent: data.intent,
              disclaimer: data.disclaimer,
            }]);
          }
        }, 8000);
      } else throw new Error();
    } catch {
      setIsStreaming(false);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "⚠️ FarmGPT is temporarily unavailable. Please try again in a moment.",
        intent: "error",
      }]);
      toast.error("FarmGPT service unavailable");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, isStreaming, sessionId, farmContext]);

  /* ── Load session ──────────────────────────────────────────────────── */
  const loadSession = async (sid) => {
    try {
      const data = await getFarmGPTSession(sid);
      if (data.success && data.chat) {
        setSessionId(sid);
        setMessages(data.chat.messages || []);
        setShowSidebar(false);
      }
    } catch { toast.error("Failed to load session"); }
  };

  const startNewChat = () => {
    setSessionId(null); setMessages([]);
    setStreamingMsg(""); streamBuf.current = "";
    setIsStreaming(false); setShowSidebar(false);
  };

  const handleDelete = async (sid, e) => {
    e.stopPropagation();
    try {
      await deleteFarmGPTSession(sid);
      setSessions(prev => prev.filter(s => s.sessionId !== sid));
      if (sessionId === sid) startNewChat();
      toast.success("Chat deleted");
    } catch { toast.error("Delete failed"); }
  };

  const isNewChat = messages.length === 0 && !loading && !isStreaming;

  return (
    <div className="flex flex-col bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef]"
      style={{ height: "100dvh", overflow: "hidden" }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-gradient-to-r from-[#0d3d22] to-[#1a6336] text-white px-4 py-3 flex items-center gap-3 shadow-lg">
        <button
          onClick={() => setShowSidebar(v => !v)}
          className="p-2 rounded-lg hover:bg-white/10 transition"
          aria-label="Toggle history"
        >
          <History size={18} />
        </button>
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <Bot size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-base leading-tight" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
            FarmGPT
          </h1>
          <p className="text-[11px] text-green-200 truncate">
            AI Crop Advisor · {farmContext.crop} · {farmContext.city || "Your Farm"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-green-200 hidden sm:block">Live</span>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 relative">

        {/* Sidebar overlay on mobile */}
        <AnimatePresence>
          {showSidebar && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/30 z-20 lg:hidden"
                onClick={() => setShowSidebar(false)}
              />
              <motion.div
                initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl z-30 flex flex-col lg:relative lg:z-auto lg:shadow-none"
              >
                <div className="p-3 border-b shrink-0 flex items-center gap-2">
                  <button onClick={startNewChat}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition">
                    <Plus size={14} /> New Chat
                  </button>
                  <button onClick={() => setShowSidebar(false)}
                    className="p-2 rounded-xl hover:bg-slate-100 transition lg:hidden">
                    <X size={16} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {sessions.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-6">No chat history yet</p>
                  )}
                  {sessions.map(s => (
                    <div key={s.sessionId} onClick={() => loadSession(s.sessionId)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition group ${
                        sessionId === s.sessionId ? "bg-green-50 border border-green-200" : "hover:bg-slate-50"
                      }`}>
                      <MessageSquare size={13} className="text-slate-400 shrink-0" />
                      <span className="flex-1 truncate text-sm text-slate-700">{s.title || "Chat"}</span>
                      <button onClick={e => handleDelete(s.sessionId, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 hover:text-red-500 transition">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── Chat area ────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">

          {/* Messages scroll area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            <style>{`.farmgpt-scroll::-webkit-scrollbar{display:none}`}</style>

            {/* Welcome screen */}
            {isNewChat && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center min-h-[40vh] text-center px-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-4 shadow-lg">
                  <Sparkles size={32} className="text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2"
                  style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                  Welcome to FarmGPT
                </h2>
                <p className="text-slate-500 text-sm max-w-xs mb-6">
                  Your AI-powered crop advisor. Ask anything about pests, diseases, irrigation, fertilizer, market prices, and more.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full max-w-2xl">
                  {QUICK_PROMPTS.map(({ icon: Icon, label, prompt }) => (
                    <button key={label} onClick={() => handleSend(prompt)}
                      className="flex flex-col items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition text-xs font-semibold text-slate-600 hover:text-green-700 shadow-sm">
                      <Icon size={18} className="text-green-600" />
                      {label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex items-start gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Bot size={15} className="text-white" />
                  </div>
                )}
                <div className={`max-w-[85%] sm:max-w-[75%] lg:max-w-[65%] rounded-2xl px-4 py-3 shadow-sm ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-green-600 to-emerald-600 text-white rounded-br-sm"
                    : "bg-white border border-slate-100 text-slate-800 rounded-bl-sm"
                }`}>
                  {msg.role === "user"
                    ? <p className="text-sm">{msg.content}</p>
                    : <MsgContent text={msg.content} />
                  }
                  {msg.disclaimer && msg.role === "assistant" && (
                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-100 text-[11px] text-amber-600">
                      <AlertTriangle size={11} /> {msg.disclaimer}
                    </div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                    <User size={15} className="text-green-700" />
                  </div>
                )}
              </motion.div>
            ))}

            {/* Streaming message */}
            {isStreaming && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <Bot size={15} className="text-white" />
                </div>
                <div className="max-w-[85%] sm:max-w-[75%] lg:max-w-[65%] bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  {streamingMsg
                    ? <MsgContent text={streamingMsg} />
                    : <TypingDots />
                  }
                </div>
              </motion.div>
            )}

            {/* Loading (waiting for server) */}
            {loading && !isStreaming && (
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
                  <Bot size={15} className="text-white" />
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <TypingDots />
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* ── Quick prompts strip (shown after first message) ─────── */}
          {messages.length > 0 && !loading && !isStreaming && (
            <div className="shrink-0 px-4 pb-2 overflow-x-auto"
              style={{ scrollbarWidth: "none" }}>
              <div className="flex gap-2 w-max">
                {QUICK_PROMPTS.slice(0, 5).map(({ icon: Icon, label, prompt }) => (
                  <button key={label} onClick={() => handleSend(prompt)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-600 hover:border-green-300 hover:text-green-700 hover:bg-green-50 transition whitespace-nowrap shadow-sm">
                    <Icon size={12} className="text-green-600" /> {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Input bar ────────────────────────────────────────────── */}
          <div className="shrink-0 border-t border-slate-200 bg-white/80 backdrop-blur-sm px-4 py-3">
            <div className="flex items-end gap-2 max-w-4xl mx-auto">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask FarmGPT about your crops... (Enter to send)"
                  rows={1}
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 resize-none bg-white transition"
                  style={{ maxHeight: "120px", overflowY: "auto", scrollbarWidth: "none" }}
                />
              </div>
              <button
                onClick={() => handleSend()}
                disabled={loading || isStreaming || !input.trim()}
                className="shrink-0 w-11 h-11 bg-gradient-to-br from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl flex items-center justify-center transition shadow-md"
              >
                {loading || isStreaming
                  ? <Loader2 size={18} className="animate-spin" />
                  : <Send size={18} />
                }
              </button>
            </div>
            <p className="text-center text-[10px] text-slate-400 mt-1.5">
              FarmGPT · AI advisory only · Always verify with your local agronomist
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
