import { useState, useRef, useCallback } from "react";
import { Send, ImagePlus, Smile, X, Reply, Wheat, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { uploadChatImage } from "../../services/chatAPI.js";

const EMOJI_LIST = ["😊", "👍", "🌾", "🌿", "✅", "🚜", "💰", "📦", "🙏", "❓", "😄", "🤝", "💯", "🔥", "⭐"];

const CROP_QUICK = [
  { name: "Wheat",  emoji: "🌾" },
  { name: "Rice",   emoji: "🍚" },
  { name: "Tomato", emoji: "🍅" },
  { name: "Cotton", emoji: "🌸" },
  { name: "Maize",  emoji: "🌽" },
  { name: "Onion",  emoji: "🧅" },
];

export default function MessageInput({ onSend, onTyping, onStopTyping, disabled, replyTo, onCancelReply }) {
  const [text, setText]               = useState("");
  const [showEmoji, setShowEmoji]     = useState(false);
  const [showCrops, setShowCrops]     = useState(false);
  const [imagePreview, setImagePreview] = useState(null); // { dataUrl, name, file }
  const [uploading, setUploading]     = useState(false);
  const typingTimer = useRef(null);
  const fileRef     = useRef(null);
  const textareaRef = useRef(null);

  const MAX_CHARS = 2000;

  const handleChange = (e) => {
    if (e.target.value.length > MAX_CHARS) return;
    setText(e.target.value);
    // Auto-resize textarea
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 112) + "px";
    onTyping?.();
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => onStopTyping?.(), 1500);
  };

  const handleSend = useCallback(async () => {
    if (disabled || uploading) return;
    const trimmed = text.trim();

    if (imagePreview) {
      // Upload the actual file to server first, then send the URL
      setUploading(true);
      try {
        const result = await uploadChatImage(imagePreview.file);
        if (!result.success || !result.url) throw new Error("Upload failed");
        onSend?.({
          messageType: "image",
          imageUrl: result.url,
          ...(replyTo ? { replyToId: replyTo._id } : {}),
        });
        setImagePreview(null);
      } catch (err) {
        alert(err.message ?? "Image upload failed. Please try again.");
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    if (trimmed) {
      onSend?.({
        messageType: "text",
        text: trimmed,
        ...(replyTo ? { replyToId: replyTo._id } : {}),
      });
      setText("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }
    onStopTyping?.();
    clearTimeout(typingTimer.current);
    onCancelReply?.();
  }, [text, imagePreview, disabled, uploading, onSend, onStopTyping, replyTo, onCancelReply]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImagePreview({ dataUrl: reader.result, name: file.name, file });
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const insertCropTag = (crop) => {
    setText(t => t + `${crop.emoji} ${crop.name} `);
    setShowCrops(false);
    textareaRef.current?.focus();
  };

  const charsLeft = MAX_CHARS - text.length;
  const nearLimit = charsLeft < 100;

  return (
    <div className="relative border-t border-slate-100 bg-white px-3 py-2.5 shrink-0">

      {/* Emoji picker */}
      <AnimatePresence>
        {showEmoji && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="absolute bottom-full left-3 mb-2 bg-white border border-slate-200 rounded-2xl shadow-xl p-2.5 flex flex-wrap gap-1 w-56 z-20"
          >
            {EMOJI_LIST.map((e) => (
              <button key={e} onClick={() => { setText(t => t + e); setShowEmoji(false); textareaRef.current?.focus(); }}
                className="text-xl w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition">
                {e}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Crop quick-tag picker */}
      <AnimatePresence>
        {showCrops && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="absolute bottom-full left-3 mb-2 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-20 w-56"
          >
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2">Quick Crop Tag</p>
            <div className="grid grid-cols-3 gap-1.5">
              {CROP_QUICK.map(c => (
                <button key={c.name} onClick={() => insertCropTag(c)}
                  className="flex flex-col items-center gap-0.5 p-2 rounded-xl hover:bg-green-50 hover:border-green-200 border border-transparent transition text-center">
                  <span className="text-xl">{c.emoji}</span>
                  <span className="text-[10px] text-slate-600 font-medium">{c.name}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply-to preview */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 mb-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2 overflow-hidden"
          >
            <Reply size={12} className="text-green-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-green-700 font-semibold">Replying to</p>
              <p className="text-xs text-slate-600 truncate">
                {replyTo.messageType === "image" ? "📷 Photo" : replyTo.text}
              </p>
            </div>
            <button onClick={onCancelReply} className="text-slate-400 hover:text-red-500 transition shrink-0">
              <X size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image preview */}
      <AnimatePresence>
        {imagePreview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 mb-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 overflow-hidden"
          >
            <img src={imagePreview.dataUrl} alt="preview" className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-600 truncate">{imagePreview.name}</p>
              <p className="text-[10px] text-slate-400">
                {uploading ? "Uploading..." : "Ready to send"}
              </p>
            </div>
            {!uploading && (
              <button onClick={() => setImagePreview(null)} className="text-slate-400 hover:text-red-500 transition shrink-0">
                <X size={14} />
              </button>
            )}
            {uploading && <Loader2 size={14} className="animate-spin text-green-600 shrink-0" />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input row */}
      <div className="flex items-end gap-1.5">
        {/* Emoji */}
        <button
          onClick={() => { setShowEmoji(v => !v); setShowCrops(false); }}
          className={`p-2 rounded-xl transition shrink-0 ${showEmoji ? "bg-amber-100 text-amber-600" : "text-slate-400 hover:text-amber-500 hover:bg-amber-50"}`}
          aria-label="Emoji"
        >
          <Smile size={18} />
        </button>

        {/* Crop tag */}
        <button
          onClick={() => { setShowCrops(v => !v); setShowEmoji(false); }}
          className={`p-2 rounded-xl transition shrink-0 ${showCrops ? "bg-green-100 text-green-700" : "text-slate-400 hover:text-green-600 hover:bg-green-50"}`}
          aria-label="Crop tag"
          title="Insert crop tag"
        >
          <Wheat size={18} />
        </button>

        {/* Image attach */}
        <button
          onClick={() => fileRef.current?.click()}
          className="p-2 rounded-xl text-slate-400 hover:text-green-600 hover:bg-green-50 transition shrink-0"
          aria-label="Attach image"
        >
          <ImagePlus size={18} />
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />

        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            disabled={disabled}
            className="w-full resize-none bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent overflow-y-auto disabled:opacity-50 transition"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none", minHeight: "40px", maxHeight: "112px" }}
          />
          {nearLimit && text.length > 0 && (
            <span className={`absolute bottom-1.5 right-3 text-[9px] font-medium ${charsLeft < 20 ? "text-red-500" : "text-amber-500"}`}>
              {charsLeft}
            </span>
          )}
        </div>

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={(!text.trim() && !imagePreview) || disabled || uploading}
          className="w-10 h-10 rounded-2xl bg-green-700 text-white flex items-center justify-center hover:bg-green-800 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-sm"
          aria-label="Send message"
        >
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        </button>
      </div>
    </div>
  );
}
