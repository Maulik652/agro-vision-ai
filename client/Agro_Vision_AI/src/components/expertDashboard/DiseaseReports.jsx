import { motion } from "framer-motion";
import { AlertTriangle, Loader2, CheckCircle } from "lucide-react";

const severityStyle = {
  low:      "bg-green-100 text-green-700 border-green-200",
  medium:   "bg-yellow-100 text-yellow-700 border-yellow-200",
  high:     "bg-orange-100 text-orange-700 border-orange-200",
  critical: "bg-red-100 text-red-700 border-red-200"
};

export default function DiseaseReports({ data = [], isLoading }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6"
    >
      <div className="flex items-center gap-2 mb-5">
        <AlertTriangle size={18} className="text-orange-500" />
        <h2 className="text-slate-800 font-semibold text-base">Crop Disease Detection Results</h2>
        <span className="ml-auto text-xs text-slate-400">CNN Model</span>
      </div>

      {isLoading ? (
        <div className="h-40 flex items-center justify-center">
          <Loader2 className="animate-spin text-orange-500" size={28} />
        </div>
      ) : data.length === 0 ? (
        <div className="h-40 flex flex-col items-center justify-center gap-2 text-slate-400">
          <CheckCircle size={32} className="text-emerald-500/50" />
          <p className="text-sm">No disease reports found</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
          {data.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3"
            >
              {r.cropImage ? (
                <img src={r.cropImage} alt={r.cropName} className="w-12 h-12 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-xl">🌿</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{r.cropName}</p>
                <p className="text-xs text-slate-500 truncate">{r.farmerName} · {r.location}</p>
                <p className="text-xs text-orange-600 mt-0.5">{r.diseaseDetected}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${severityStyle[r.severity] || severityStyle.low}`}>
                  {r.severity}
                </span>
                <span className="text-[10px] text-slate-400">{r.confidence}% conf.</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
