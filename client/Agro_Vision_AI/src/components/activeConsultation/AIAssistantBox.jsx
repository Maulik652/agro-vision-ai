import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { Sparkles, Loader2, ChevronDown, Copy, Check } from "lucide-react";
import { fetchAIAssistant } from "../../api/consultationApi";
import toast from "react-hot-toast";

export default function AIAssistantBox({ consultation, onUseSuggestion }) {
  const [open, setOpen]             = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [copied, setCopied]         = useState(null);

  const mutation = useMutation({
    mutationFn: () => fetchAIAssistant({
      cropType: consultation?.cropType || "",
      problemDescription: consultation?.description || "",
      lastMessage: ""
    }),
    onSuccess: (data) => {
      setSuggestions(data?.suggestions || []);
    },
    onError: () => toast.error("AI assistant unavailable")
  });

  const handleCopy = (text, i) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(i);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <button onClick={() => { setOpen(v => !v); if (!open && suggestions.length === 0) mutation.mutate(); }}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-violet-600" />
          <span className="text-xs font-semibold text-slate-900">AI Assistant</span>
          <span className="text-[10px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full">Smart</span>
        </div>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            className="overflow-hidden border-t border-slate-50">
            <div className="px-4 py-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-slate-400">Suggested replies for this case</p>
                <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
                  className="text-[10px] text-violet-600 hover:text-violet-700 flex items-center gap-1 disabled:opacity-50">
                  {mutation.isPending ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                  Refresh
                </button>
              </div>

              {mutation.isPending ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 size={20} className="animate-spin text-violet-500" />
                </div>
              ) : suggestions.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No suggestions yet</p>
              ) : (
                <div className="space-y-2">
                  {suggestions.map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="group relative p-3 rounded-xl bg-violet-50 border border-violet-100 hover:border-violet-300 transition cursor-pointer"
                      onClick={() => onUseSuggestion?.(s)}>
                      <p className="text-xs text-slate-700 leading-relaxed pr-6">{s}</p>
                      <button onClick={(e) => { e.stopPropagation(); handleCopy(s, i); }}
                        className="absolute top-2 right-2 p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-violet-100 transition text-violet-500">
                        {copied === i ? <Check size={11} /> : <Copy size={11} />}
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}

              <p className="text-[10px] text-slate-300 text-center">Click a suggestion to use it in chat</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
