/**
 * ChatAvatar — shows real profile photo or gradient initial fallback.
 * Used in ConversationItem, ChatHeader, and MessageBubble.
 */
export default function ChatAvatar({ user, size = 10, showOnline = false, online = false }) {
  const name   = user?.name ?? "?";
  const photo  = user?.photo || user?.avatar || "";
  const initials = name.charAt(0).toUpperCase();

  const sizeClass = {
    7:  "w-7 h-7 text-xs",
    8:  "w-8 h-8 text-xs",
    9:  "w-9 h-9 text-sm",
    10: "w-10 h-10 text-sm",
    12: "w-12 h-12 text-base",
  }[size] ?? "w-10 h-10 text-sm";

  const dotSize = size >= 10 ? "w-3 h-3" : "w-2.5 h-2.5";

  return (
    <div className="relative shrink-0">
      {photo ? (
        <img
          src={photo}
          alt={name}
          className={`${sizeClass} rounded-full object-cover border-2 border-white shadow-sm`}
          onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
        />
      ) : null}
      {/* Fallback initial — always rendered, hidden when photo loads */}
      <div
        className={`${sizeClass} rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold shadow-sm ${photo ? "hidden" : "flex"}`}
        aria-label={name}
      >
        {initials}
      </div>
      {showOnline && (
        <span className={`absolute bottom-0 right-0 ${dotSize} rounded-full border-2 border-white transition-colors ${online ? "bg-green-500" : "bg-slate-300"}`} />
      )}
    </div>
  );
}
