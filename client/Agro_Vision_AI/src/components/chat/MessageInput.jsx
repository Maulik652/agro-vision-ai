/**
 * MessageInput — bottom bar with text input, emoji, image upload, and send.
 */
import { useState, useRef, useCallback } from "react";
import { Send, ImagePlus, Smile } from "lucide-react";

const EMOJI_LIST = ["😊", "👍", "🌾", "🌿", "✅", "🚜", "💰", "📦", "🙏", "❓"];

export default function MessageInput({ onSend, onTyping, onStopTyping, disabled }) {
  const [text, setText]           = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const typingTimer               = useRef(null);
  const fileRef                   = useRef(null);

  const handleChange = (e) => {
    setText(e.target.value);
    onTyping?.();
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => onStopTyping?.(), 1500);
  };

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend?.({ messageType: "text", text: trimmed });
    setText("");
    onStopTyping?.();
    clearTimeout(typingTimer.current);
  }, [text, disabled, onSend, onStopTyping]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // In production: upload to Cloudinary/S3, then send imageUrl
    // For now, create a local object URL as placeholder
    const url = URL.createObjectURL(file);
    onSend?.({ messageType: "image", imageUrl: url });
    e.target.value = "";
  };

  const insertEmoji = (emoji) => {
    setText((t) => t + emoji);
    setShowEmoji(false);
  };

  return (
    <div className="relative border-t border-slate-100 bg-white px-4 py-3">
      {/* Emoji picker */}
      {showEmoji && (
        <div className="absolute bottom-full left-4 mb-2 bg-white border border-slate-200 rounded-xl shadow-lg p-2 flex flex-wrap gap-1 w-52 z-10">
          {EMOJI_LIST.map((e) => (
            <button
              key={e}
              onClick={() => insertEmoji(e)}
              className="text-lg hover:bg-slate-100 rounded p-1 transition-colors"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Emoji button */}
        <button
          onClick={() => setShowEmoji((v) => !v)}
          className="text-slate-400 hover:text-green-600 transition-colors p-1.5 shrink-0"
          aria-label="Emoji"
        >
          <Smile size={18} />
        </button>

        {/* Image upload */}
        <button
          onClick={() => fileRef.current?.click()}
          className="text-slate-400 hover:text-green-600 transition-colors p-1.5 shrink-0"
          aria-label="Attach image"
        >
          <ImagePlus size={18} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
        />

        {/* Text input */}
        <textarea
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent max-h-28 overflow-y-auto disabled:opacity-50"
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className="w-9 h-9 rounded-xl bg-green-700 text-white flex items-center justify-center hover:bg-green-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          aria-label="Send message"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
