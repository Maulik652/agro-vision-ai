import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, Sparkles, Loader2, User, TrendingUp, Clock, MapPin, Leaf } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { askAIAssistant } from "../../../api/farmerMarketplaceApi";

const CROPS = ["Wheat","Rice","Maize","Cotton","Soybean","Groundnut","Potato","Tomato","Onion","Mango","Grapes","Sunflower"];

const QUICK_QUESTIONS = [
  { label: "Should I increase price?",    q: "Should I increase the price of my crop?" },
  { label: "Best time to sell?",          q: "What is the best time to sell my crop?" },
  { label: "Which market is best?",       q: "Which market should I sell in?" },
  { label: "Organic vs normal pricing?",  q: "What is the price difference for organic vs normal grade?" },
];

export default function AISellingAssistant() {
  const [crop, setCrop] = useState("Wheat");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi! I'm your AI Selling Assistant powered by AgroVision AI. Ask me anything about pricing, demand, best markets, or when to sell your crops.",
      context: null,
    },
  ]);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const { mutate: ask, isPending } = useMutation({
    mutationFn: (question) => askAIAssistant({ question, crop }),
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        role: "assistant",
        text: data?.answer || "I couldn't process that. Please try again.",
        context: data?.context || null,
      }]);
    },
    onError: () => {
      toast.error("AI Assistant unavailable");
      setMessages(prev => [...prev, { role: "assistant", text: "Sorry, I'm having trouble connecting. Please try again.", context: null }]);
    },
  });

  const handleSend = (question) => {
    const q = question || input.trim();
    if (!q) return;
    setMessages(prev => [...prev, { role: "user", text: q }]);
    setInput("");
    ask(q);
  };

  const DEMAND_COLORS = { High: "text-emerald-600 bg-emerald-50", Medium: "text-amber-600 bg-amber-50", Low: "text-rose-600 bg-rose-50" };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-violet-50 to-purple-50 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 shadow-sm">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800">AI Selling Assistant</h3>
            <p className="text-[10px] text-slate-500">Powered by AgroVision AI · Ask anything about selling</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={crop} onChange={e => setCrop(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-violet-400 focus:outline-none">
            {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>

      {/* Quick questions */}
      <div className="flex gap-2 overflow-x-auto px-5 py-3 border-b border-slate-50 scrollbar-hide">
        {QUICK_QUESTIONS.map(q => (
          <motion.button key={q.label} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => handleSend(q.q)} disabled={isPending}
            className="shrink-0 flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-100 transition disabled:opacity-50">
            <Sparkles size={10} /> {q.label}
          </motion.button>
        ))}
      </div>

      {/* Messages */}
      <div className="h-96 overflow-y-auto px-5 py-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              {/* Avatar */}
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${msg.role === "assistant" ? "bg-gradient-to-br from-violet-600 to-purple-700" : "bg-emerald-600"}`}>
                {msg.role === "assistant" ? <Bot size={14} className="text-white" /> : <User size={14} className="text-white" />}
              </div>

              {/* Bubble */}
              <div className={`max-w-[80%] space-y-2 ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "assistant" ? "bg-slate-50 border border-slate-100 text-slate-800 rounded-tl-sm" : "bg-emerald-600 text-white rounded-tr-sm"}`}>
                  {msg.text}
                </div>

                {/* Context chips */}
                {msg.context && (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      <TrendingUp size={9} /> ₹{msg.context.currentPrice}/qtl
                    </span>
                    <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${DEMAND_COLORS[msg.context.demandLevel] || "bg-slate-100 text-slate-600"}`}>
                      {msg.context.demandLevel} Demand
                    </span>
                    <span className="flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-600">
                      <Sparkles size={9} /> {msg.context.confidence}% confidence
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isPending && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-700">
              <Bot size={14} className="text-white" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-slate-50 border border-slate-100 px-4 py-3">
              <Loader2 size={13} className="animate-spin text-violet-600" />
              <span className="text-xs text-slate-500">Analyzing market data...</span>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-100 px-5 py-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={`Ask about ${crop} pricing, demand, best markets...`}
            disabled={isPending}
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 disabled:opacity-60"
          />
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => handleSend()} disabled={!input.trim() || isPending}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-sm hover:shadow-md transition disabled:opacity-50">
            <Send size={15} />
          </motion.button>
        </div>
        <p className="mt-2 text-[10px] text-slate-400 text-center">AI responses are based on real-time market data and seasonal trends</p>
      </div>
    </div>
  );
}
