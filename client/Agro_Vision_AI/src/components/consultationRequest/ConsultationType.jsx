import { motion } from "framer-motion";
import { MessageSquare, Phone, Video } from "lucide-react";

const TYPES = [
  { value: "chat",  label: "Chat",       icon: MessageSquare, desc: "Text-based consultation",  color: "text-blue-600",   bg: "bg-blue-100",   border: "border-blue-300" },
  { value: "phone", label: "Phone Call", icon: Phone,         desc: "Voice call with expert",   color: "text-green-400",  bg: "bg-green-100",  border: "border-green-300" },
  { value: "video", label: "Video Call", icon: Video,         desc: "Face-to-face video session",color: "text-purple-600", bg: "bg-purple-100", border: "border-purple-500/40" },
];

export default function ConsultationType({ selected, onSelect }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-4"
    >
      <div>
        <h2 className="text-slate-900 font-semibold text-lg">Consultation Type</h2>
        <p className="text-slate-500 text-xs mt-0.5">How would you like to connect with the expert?</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {TYPES.map(({ value, label, icon: Icon, desc, color, bg, border }) => (
          <button
            key={value}
            onClick={() => onSelect(value)}
            className={`flex flex-col items-center gap-3 p-5 rounded-xl border transition-all ${
              selected === value
                ? `${bg} ${border}`
                : "bg-slate-50 border-slate-100 hover:border-slate-200"
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selected === value ? bg : "bg-white/10"}`}>
              <Icon size={20} className={selected === value ? color : "text-slate-400"} />
            </div>
            <div className="text-center">
              <p className={`font-semibold text-sm ${selected === value ? "text-slate-900" : "text-slate-500"}`}>{label}</p>
              <p className="text-slate-400 text-xs mt-0.5">{desc}</p>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
