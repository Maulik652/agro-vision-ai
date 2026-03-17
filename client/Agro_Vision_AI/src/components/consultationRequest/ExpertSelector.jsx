import { motion } from "framer-motion";
import { Users, Star, MapPin, Zap, CheckCircle2 } from "lucide-react";

export default function ExpertSelector({ experts = [], selectedId, onSelect, autoAssign, onToggleAuto }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-4"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
          <Users size={18} className="text-amber-400" />
        </div>
        <div>
          <h2 className="text-slate-900 font-semibold text-lg">Select Expert</h2>
          <p className="text-slate-500 text-xs">Choose manually or let AI assign the best expert</p>
        </div>
      </div>

      {/* Auto-assign toggle */}
      <button
        onClick={onToggleAuto}
        className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${
          autoAssign
            ? "bg-green-100 border-green-300 text-green-700"
            : "bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-200"
        }`}
      >
        <Zap size={16} className={autoAssign ? "text-green-400" : "text-slate-400"} />
        <div className="text-left">
          <p className="font-medium text-sm">Auto-assign Best Expert</p>
          <p className="text-xs opacity-70">AI picks the highest-rated available expert</p>
        </div>
        {autoAssign && <CheckCircle2 size={16} className="text-green-400 ml-auto" />}
      </button>

      {/* Manual selection */}
      {!autoAssign && (
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {experts.length === 0 && (
            <p className="text-slate-400 text-sm text-center py-4">No experts available</p>
          )}
          {experts.map(expert => (
            <button
              key={expert._id}
              onClick={() => onSelect(expert._id)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                selectedId === expert._id
                  ? "bg-green-100 border-green-300"
                  : "bg-slate-50 border-slate-100 hover:border-slate-200"
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0 overflow-hidden">
                {expert.avatar
                  ? <img src={expert.avatar} alt={expert.name} className="w-full h-full object-cover" />
                  : <span className="text-green-400 font-bold text-sm">{expert.name?.[0]}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-800 font-medium text-sm truncate">{expert.name}</p>
                <p className="text-slate-500 text-xs truncate">{expert.specialization || "Agriculture Expert"}</p>
                {(expert.city || expert.state) && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin size={10} className="text-slate-400" />
                    <span className="text-slate-400 text-xs">{[expert.city, expert.state].filter(Boolean).join(", ")}</span>
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 justify-end">
                  <Star size={11} className="text-yellow-600 fill-yellow-400" />
                  <span className="text-slate-600 text-xs">{expert.rating?.toFixed(1) || "N/A"}</span>
                </div>
                <p className="text-green-400 font-semibold text-sm mt-0.5">
                  ₹{expert.consultationFee || 0}
                </p>
              </div>
              {selectedId === expert._id && (
                <CheckCircle2 size={16} className="text-green-400 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
