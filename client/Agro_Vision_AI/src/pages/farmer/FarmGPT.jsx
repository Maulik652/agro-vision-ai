import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Send,
  User,
  Loader2,
  Plus,
  Trash2,
  MessageSquare,
  Sprout,
  CloudSun,
  Bug,
  Droplets,
  FlaskConical,
  TrendingUp,
  Wheat,
  Leaf,
  Sparkles,
  History,
  AlertTriangle,
  X
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import {
  sendFarmGPTMessage,
  getFarmGPTSessions,
  getFarmGPTSession,
  deleteFarmGPTSession
} from "../../api/farmerApi";

import toast from "react-hot-toast";

const QUICK_PROMPTS = [
  { icon: Bug, label: "Pest Control", prompt: "What pests should I watch for and how to control them?" },
  { icon: Droplets, label: "Irrigation", prompt: "When should I irrigate my crop next?" },
  { icon: FlaskConical, label: "Fertilizer", prompt: "What fertilizer should I apply now?" },
  { icon: CloudSun, label: "Weather", prompt: "Is it safe to spray pesticide today?" },
  { icon: TrendingUp, label: "Market Price", prompt: "When is the best time to sell my crop?" },
  { icon: Wheat, label: "Harvest", prompt: "Is my crop ready to harvest?" },
  { icon: Leaf, label: "Disease", prompt: "My leaves are turning yellow. What should I do?" },
  { icon: Sprout, label: "Sowing", prompt: "What should I do before sowing?" }
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 }
};

const FarmGPT = () => {
  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);

  const [showSidebar, setShowSidebar] = useState(false);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  const [farmContext] = useState({
    crop: user?.crops || "Wheat",
    city: user?.city || "",
    state: user?.state || "",
    farmSize: user?.farmSize || 2,
    soilType: "loamy",
    sowingDate: null,
    season: "rabi"
  });

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(scrollToBottom, [messages, scrollToBottom]);

  /* Load Sessions */

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const data = await getFarmGPTSessions();
        if (data.success) setSessions(data.sessions || []);
      } catch {}
    };

    loadSessions();
  }, []);

  /* Send Message */

  const handleSend = async (text) => {
    const question = (text || input).trim();
    if (!question || loading) return;

    setInput("");

    setMessages((prev) => [...prev, { role: "user", content: question }]);

    setLoading(true);

    try {
      const data = await sendFarmGPTMessage(question, sessionId, farmContext);

      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.response,
            intent: data.intent,
            disclaimer: data.disclaimer
          }
        ]);

        if (data.sessionId && !sessionId) {
          setSessionId(data.sessionId);
        }
      } else {
        throw new Error();
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "FarmGPT is temporarily unavailable. Please try again.",
          intent: "error"
        }
      ]);

      toast.error("FarmGPT service unavailable");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  /* Load Session */

  const loadSession = async (sid) => {
    try {
      const data = await getFarmGPTSession(sid);

      if (data.success && data.chat) {
        setSessionId(sid);
        setMessages(data.chat.messages || []);
        setShowSidebar(false);
      }
    } catch {
      toast.error("Failed to load session");
    }
  };

  /* New Chat */

  const startNewChat = () => {
    setSessionId(null);
    setMessages([]);
    setShowSidebar(false);
  };

  /* Delete Session */

  const handleDeleteSession = async (sid, e) => {
    e.stopPropagation();

    try {
      await deleteFarmGPTSession(sid);

      setSessions((prev) =>
        prev.filter((s) => s.sessionId !== sid)
      );

      if (sessionId === sid) startNewChat();

      toast.success("Chat deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  /* Markdown Rendering */

  const renderContent = (text) => {
    if (!text) return null;

    const lines = text.split("\n");

    return lines.map((line, i) => {
      let processed = line
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>");

      if (line.startsWith("• ") || line.startsWith("- ")) {
        return (
          <li
            key={i}
            className="ml-4 text-sm"
            dangerouslySetInnerHTML={{ __html: processed.slice(2) }}
          />
        );
      }

      if (line.trim() === "") return <br key={i} />;

      return (
        <p
          key={i}
          className="text-sm"
          dangerouslySetInnerHTML={{ __html: processed }}
        />
      );
    });
  };

  const isNewChat = messages.length === 0;

  return (
    <div className="min-h-screen bg-linear-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef]">

      {/* Header */}

      <div className="bg-linear-to-r from-[#0d3d22] to-[#1a6336] text-white px-6 py-4 flex items-center gap-4">

        <button onClick={() => setShowSidebar(!showSidebar)}>
          <History size={18} />
        </button>

        <div className="flex items-center gap-3">

          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            <Bot size={20} />
          </div>

          <div>
            <h1 className="font-bold text-lg">FarmGPT</h1>
            <p className="text-xs text-green-200">
              AI Crop Advisor
            </p>
          </div>

        </div>

      </div>

      <div className="flex h-[calc(100vh-72px)]">

        {/* Sidebar */}

        <AnimatePresence>

          {showSidebar && (
            <motion.div
              initial={{ x: -250 }}
              animate={{ x: 0 }}
              exit={{ x: -250 }}
              className="w-72 bg-white border-r overflow-y-auto"
            >

              <div className="p-3 border-b">

                <button
                  onClick={startNewChat}
                  className="w-full bg-green-600 text-white py-2 rounded-lg flex items-center justify-center gap-2"
                >
                  <Plus size={14} />
                  New Chat
                </button>

              </div>

              <div className="p-2 space-y-1">

                {sessions.map((s) => (
                  <div
                    key={s.sessionId}
                    onClick={() => loadSession(s.sessionId)}
                    className="flex items-center gap-2 px-3 py-2 rounded hover:bg-green-50 cursor-pointer"
                  >
                    <MessageSquare size={14} />
                    <span className="flex-1 truncate">
                      {s.title || "Chat"}
                    </span>

                    <button
                      onClick={(e) =>
                        handleDeleteSession(s.sessionId, e)
                      }
                    >
                      <Trash2 size={12} />
                    </button>

                  </div>
                ))}

              </div>

            </motion.div>
          )}

        </AnimatePresence>

        {/* Chat Area */}

        <div className="flex-1 flex flex-col relative">

          {/* Vertical Conversation Line */}

          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-green-100 opacity-40 pointer-events-none"></div>

          {/* Messages */}

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

            {isNewChat && (
              <div className="text-center">

                <Sparkles className="mx-auto mb-4 text-green-600" size={40} />

                <h2 className="text-xl font-bold">
                  Welcome to FarmGPT
                </h2>

                <p className="text-slate-500 text-sm">
                  Ask anything about your crops
                </p>

              </div>
            )}

            {messages.map((msg, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className={`flex w-full items-start gap-3 ${
                  msg.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >

                {msg.role === "assistant" && (
                  <div className="w-8 h-8 bg-green-600 text-white rounded-lg flex items-center justify-center">
                    <Bot size={16} />
                  </div>
                )}

                <div
                  className={`max-w-[75%] sm:max-w-[65%] lg:max-w-[60%] rounded-2xl px-5 py-3 ${
                    msg.role === "user"
                      ? "bg-green-600 text-white rounded-br-md"
                      : "bg-white border rounded-bl-md"
                  }`}
                >

                  {renderContent(msg.content)}

                  {msg.disclaimer && (
                    <div className="text-xs text-amber-600 mt-2 flex gap-1">
                      <AlertTriangle size={12} />
                      {msg.disclaimer}
                    </div>
                  )}

                </div>

                {msg.role === "user" && (
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <User size={16} />
                  </div>
                )}

              </motion.div>
            ))}

            {loading && (
              <div className="flex gap-3">

                <div className="w-8 h-8 bg-green-600 text-white rounded-lg flex items-center justify-center">
                  <Bot size={16} />
                </div>

                <div className="bg-white border px-4 py-3 rounded-xl flex items-center gap-2 text-sm">

                  <Loader2
                    size={14}
                    className="animate-spin text-green-600"
                  />

                  FarmGPT thinking...

                </div>

              </div>
            )}

            <div ref={chatEndRef}></div>

          </div>

          {/* Input */}

          <div className="border-t bg-white p-4 flex gap-3">

            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && handleSend()
              }
              placeholder="Ask FarmGPT..."
              className="flex-1 border rounded-xl px-4 py-2 outline-none focus:border-green-500"
            />

            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="bg-green-600 text-white p-3 rounded-xl"
            >
              <Send size={18} />
            </button>

          </div>

        </div>

      </div>

    </div>
  );
};

export default FarmGPT;