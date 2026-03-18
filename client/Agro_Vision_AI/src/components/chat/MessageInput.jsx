import { useState, useRef, useCallback } from "react";
import { Send, ImagePlus, Smile, X } from "lucide-react";

const EMOJI_LIST = ["😊", "👍", "🌾", "🌿", "✅", "🚜", "💰", "📦", "🙏", "❓"];

export default function MessageInput({ onSend, onTyping, onStopTyping, disabled }) {
  const [text, setText]               = useState("");
  const [showEmoji, setShowEmoji]     = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const typingTimer = useRef(null);
  const fileRef     = useRef(null);

  const handleChange = (e) => {
    setText(e.target.value);
    onTyping?.();
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => onStopTyping?.(), 1500);
  };

  const handleSend = useCallback(() => {
    if (disabled) return;
    if (imagePreview) {
      onSend?.({ messageType: "image", imageUrl: imagePreview.dataUrl });
      setImagePreview(null);
    }
    const trimmed = text.trim();
    if (trimmed) {
      onSend?.({ messageType: "text", text: trimmed });
      setText("");
    }
    onStopTyping?.();
    clearTimeout(typingTimer.current);
  }, [text, imagePreview, disabled, onSend, onStopTyping]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImagePreview({ dataUrl: reader.result, name: file.name });
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="relative border-t border-slate-100 bg-white px-4 py-3 shrink-0">
      {showEmoji && (
        <div className="absolute bottom-full left-4 mb-2 bg-white border border-slate-200 rounded-xl shadow-lg p-2 flex flex-wrap gap-1 w-52 z-10">
          {EMOJI_LIST.map((e) => (
            <button key={e} onClick={() => { setText((t) => t + e); setShowEmoji(false); }}
              className="text-lg hover:bg-slate-100 rounded p-1 transition-colors">
              {e}
            </button>
          ))}
        </div>
      )}

      {imagePreview && (
        <div className="flex items-center gap-2 mb-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
          <img src={imagePreview.dataUrl} alt="preview" className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
          <span className="text-xs text-slate-500 truncate flex-1">{imagePreview.name}</span>
          <button onClick={() => setImagePreview(null)} className="text-slate-400 hover:text-red-500 transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <button onClick={() => setShowEmoji((v) => !v)}
          className="text-slate-400 hover:text-green-600 transition-colors p-1.5 shrink-0" aria-label="Emoji">
          <Smile size={18} />
        </button>

        <button onClick={() => fileRef.current?.click()}
          className="text-slate-400 hover:text-green-600 transition-colors p-1.5 shrink-0" aria-label="Attach image">
          <ImagePlus size={18} />
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />

        <textarea
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent max-h-28 overflow-y-auto disabled:opacity-50"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        />

        <button
          onClick={handleSend}
          disabled={(!text.trim() && !imagePreview) || disabled}
          className="w-9 h-9 rounded-xl bg-green-700 text-white flex items-center justify-center hover:bg-green-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          aria-label="Send message"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
