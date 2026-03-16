/**
 * ProfileAvatar — clickable avatar shown in the navbar.
 * Renders photo if available, otherwise initials with role-based gradient.
 */
import { motion } from "framer-motion";

const ROLE_GRADIENT = {
  buyer:  "from-emerald-500 to-green-600",
  farmer: "from-amber-500 to-orange-600",
  expert: "from-blue-500 to-indigo-600",
  admin:  "from-purple-500 to-violet-600",
};

export default function ProfileAvatar({ user, onClick, size = "md" }) {
  const role     = user?.role?.toLowerCase() || "buyer";
  const gradient = ROLE_GRADIENT[role] || ROLE_GRADIENT.buyer;
  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const dim = size === "sm" ? "w-8 h-8 text-xs" : "w-9 h-9 text-sm";

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      className={`relative ${dim} rounded-full ring-2 ring-white/30 hover:ring-green-400 transition-all focus:outline-none`}
      aria-label="Open profile"
    >
      {user?.photo ? (
        <img
          src={user.photo}
          alt={user.name}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <div className={`w-full h-full rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center font-bold text-white`}>
          {initials}
        </div>
      )}
      {/* Online dot */}
      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-[#14532D]" />
    </motion.button>
  );
}
