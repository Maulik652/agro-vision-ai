import { motion } from "framer-motion";
import { Brain, Loader2, AlertTriangle, CheckCircle2, Zap } from "lucide-react";

const severityColor = {
  low:      "text-green-400",
  medium:   "text-yellow-600",
  high:     "text-orange-600",
  critical: "text-red-400",
};

const severityBg = {
  low:      "bg-green-500/10 border-green-200",
  medium:   "bg-yellow-50 border-yellow-200",
  high:     "bg-orange-50 border-orange-200",
  critical: "bg-red-50 border-red-200",
};

export default function AIAnalysisPreview({ analysis, loading, error }) {
  if (!loading && !analysis && !error) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
          <Brain size={18} className="text-purple-600" />
        </div>
        <div>
          <h2 className="text-slate-900 font-semibold text-lg">AI Crop Analysis</h2>
          <p className="text-slate-500 text-xs">Powered by CNN disease detection model</p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-3 py-6 justify-center">
          <Loader2 size={22} className="text-purple-600 animate-spin" />
          <span className="text-slate-500 text-sm">Analyzing your crop images...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle size={18} className="text-red-400 shrink-0" />
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {analysis && !loading && (
        <div className="space-y-4">
          <div className={`p-4 rounded-xl border ${severityBg[analysis.severity] || severityBg.low}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-slate-500 text-xs mb-1">Detected Issue</p>
                <p className="text-slate-900 font-semibold text-base">{analysis.disease || "No disease detected"}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-slate-500 text-xs mb-1">Confidence</p>
                <p className={`font-bold text-lg ${severityColor[analysis.severity] || "text-green-400"}`}>
                  {Math.round((analysis.confidence || 0) * 100)}%
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap size={14} className="text-yellow-600" />
                <p className="text-slate-500 text-xs font-medium">Severity</p>
              </div>
              <p className={`font-semibold capitalize ${severityColor[analysis.severity] || "text-green-400"}`}>
                {analysis.severity || "Low"}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={14} className="text-green-400" />
                <p className="text-slate-500 text-xs font-medium">Suggested Treatment</p>
              </div>
              <p className="text-slate-700 text-sm leading-relaxed">{analysis.treatment || "Consult expert for treatment plan"}</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
