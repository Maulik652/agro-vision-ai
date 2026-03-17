import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";

const useCountUp = (target, duration = 1000) => {
  const [value, setValue] = useState(0);
  const frame = useRef(null);
  useEffect(() => {
    const start = performance.now();
    const to = Number(target || 0);
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(to * eased));
      if (p < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target, duration]);
  return value;
};

export default function StatsCard({ label, value, icon: Icon, gradient, change, changeLabel, format, index = 0 }) {
  const numeric = Number(String(value || "0").replace(/[^0-9.]/g, ""));
  const counted = useCountUp(numeric);
  const display = format ? format(counted) : counted.toLocaleString("en-IN");
  const isPositive = !change || change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      whileHover={{ y: -3, boxShadow: "0 20px 40px -12px rgba(0,0,0,0.1)" }}
      className="relative overflow-hidden rounded-2xl bg-white border border-slate-100 p-5 shadow-sm cursor-default"
    >
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`} />
      <div className="flex items-start justify-between mb-4 pt-1">
        <div className={`inline-flex rounded-xl p-2.5 bg-gradient-to-br ${gradient} bg-opacity-10`}>
          <Icon size={18} className="text-white" />
        </div>
        {change !== undefined && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
            isPositive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
          }`}>
            {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900 tabular-nums">{display}</p>
      {changeLabel && <p className="text-xs text-slate-400 mt-1">{changeLabel}</p>}
    </motion.div>
  );
}
