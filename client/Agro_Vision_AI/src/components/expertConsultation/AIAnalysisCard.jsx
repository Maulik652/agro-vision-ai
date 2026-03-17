import { useState } from "react";
import { motion } from "framer-motion";
import { Brain, Loader2, Zap, AlertTriangle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import api from "../../api/axios";
import toast from "react-hot-toast";

const SEV_STYLE = {
  low:      "text-emerald-700 bg-emerald-100 border-emerald-200",
  medium:   "text-yellow-700 bg-yellow-100 border-yellow-200",
  high:     "text-orange-700 bg-orange-100 border-orange-200",
  critical: "text-red-700 bg-red-100 border-red-200"
};

export default function AIAnalysisCard({ consultation, onAnalysisDone }) {
  const [result, setResult] = useState(consultation?.aiAnalysis || null);

  const analyzeMut = useMutation({
    mutationFn: async () => {
      const r = await api.post("/ai/crop-analysis", {
        consultationId: consultation._id,
        cropType: consultation.cropType,
        images: consultation.images || []
      });
      return r?.data?.data;
    },
    onSuccess: (data) => {
      setResult(data);
      onAnalysisDone?.(data);
      toast.success("AI analysis complete");
    },
    onError: () => toast.error("AI analysis failed")
  });

  const hasImages = consultation?.images?.length > 0;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Brain size={16} className="text-purple-600" />
        <h3 className="text-slate-800 font-semibold text-sm">AI Crop Analysis</h3>
        <span className="ml-auto text-[10px] text-slate-400">CNN Model</span>
      </div>

      {result ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Disease Detected</span>
            <span className="text-sm font-semibold text-slate-900">{result.disease || "None"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Confidence</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${result.confidence || 0}%` }} />
              </div>
              <span className="text-xs text-slate-700">{result.confidence || 0}%</span>
            </div>
          </div>
          {result.severity && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Severity</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${SEV_STYLE[result.severity] || SEV_STYLE.low}`}>
                {result.severity}
              </span>
            </div>
          )}
          {result.treatment && (
            <div className="mt-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <p className="text-xs text-slate-400 mb-1">Suggested Treatment</p>
              <p className="text-sm text-slate-700">{result.treatment}</p>
            </div>
          )}
          <button onClick={() => analyzeMut.mutate()} disabled={!hasImages || analyzeMut.isPending}
            className="w-full mt-2 py-2 text-xs rounded-xl border border-purple-200 text-purple-600 hover:bg-purple-50 transition disabled:opacity-40">
            Re-analyze
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-4">
          {!hasImages && (
            <div className="flex items-center gap-2 text-yellow-600 text-xs mb-2">
              <AlertTriangle size={13} /> No images uploaded for analysis
            </div>
          )}
          <button onClick={() => analyzeMut.mutate()} disabled={!hasImages || analyzeMut.isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition">
            {analyzeMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            {analyzeMut.isPending ? "Analyzing..." : "Run AI Analysis"}
          </button>
          <p className="text-xs text-slate-400">Uses CNN disease classification model</p>
        </div>
      )}
    </motion.div>
  );
}
