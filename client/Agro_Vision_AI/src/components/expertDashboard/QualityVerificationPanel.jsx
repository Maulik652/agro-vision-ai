import { motion } from "framer-motion";
import { ShieldCheck, Loader2 } from "lucide-react";

const gradeStyle = {
  A: "bg-emerald-100 text-emerald-700 border-emerald-200",
  B: "bg-blue-100 text-blue-700 border-blue-200",
  C: "bg-yellow-100 text-yellow-700 border-yellow-200",
  D: "bg-red-100 text-red-700 border-red-200"
};

export default function QualityVerificationPanel({ data = [], isLoading }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6"
    >
      <div className="flex items-center gap-2 mb-5">
        <ShieldCheck size={18} className="text-blue-600" />
        <h2 className="text-slate-800 font-semibold text-base">AI Quality Verification Panel</h2>
        <span className="ml-auto text-xs text-slate-400">CNN Classifier</span>
      </div>

      {isLoading ? (
        <div className="h-40 flex items-center justify-center">
          <Loader2 className="animate-spin text-blue-500" size={28} />
        </div>
      ) : data.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No quality reports</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
          {data.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col gap-2"
            >
              {r.cropImage ? (
                <img src={r.cropImage} alt={r.cropName} className="w-full h-20 object-cover rounded-lg" />
              ) : (
                <div className="w-full h-20 rounded-lg bg-slate-100 flex items-center justify-center text-3xl">🌾</div>
              )}
              <p className="text-xs font-medium text-slate-800 truncate">{r.cropName}</p>
              <p className="text-[10px] text-slate-400 truncate">{r.farmerName}</p>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${gradeStyle[r.aiGrade] || gradeStyle.B}`}>
                  Grade {r.aiGrade}
                </span>
                <span className="text-[10px] text-slate-400">{r.confidence}%</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
