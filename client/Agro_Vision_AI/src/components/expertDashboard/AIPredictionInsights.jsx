import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Brain, Loader2, TrendingUp, BarChart2, Zap } from "lucide-react";
import { fetchExpertAIPredictions } from "../../api/expertDashboardApi";

const levelColor = { high: "text-emerald-400", medium: "text-yellow-400", low: "text-red-400" };

export default function AIPredictionInsights({ availableCrops = [] }) {
  const [crop, setCrop] = useState("Wheat");
  const crops = availableCrops.length ? availableCrops : ["Wheat", "Rice", "Maize", "Cotton", "Soybean"];

  const { data, isLoading } = useQuery({
    queryKey: ["expert-ai-predictions", crop],
    queryFn: () => fetchExpertAIPredictions({ crop }),
    staleTime: 120_000
  });

  const metrics = data
    ? [
        { icon: TrendingUp, label: "Predicted Market Price", value: `₹${data.predictedMarketPrice}/kg`, sub: `Current avg: ₹${data.currentAvgPrice}` },
        { icon: BarChart2,  label: "Demand Forecast",        value: data.demandForecast?.level?.toUpperCase() || "—", sub: `Score: ${data.demandForecast?.score || 0}/100`, colorClass: levelColor[data.demandForecast?.level] },
        { icon: Zap,        label: "Predicted Yield",        value: data.predictedYield || "—", sub: "Per listing avg" },
        { icon: Brain,      label: "AI Confidence",          value: `${data.confidence || 0}%`, sub: `Model: ${data.modelsUsed?.priceModel || "xgboost"}` }
      ]
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Brain size={18} className="text-purple-600" />
          <h2 className="text-slate-800 font-semibold text-base">AI Crop Prediction Insights</h2>
        </div>
        <select
          value={crop}
          onChange={(e) => setCrop(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-1.5 outline-none"
        >
          {crops.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="h-32 flex items-center justify-center">
          <Loader2 className="animate-spin text-purple-500" size={28} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {metrics.map((m, i) => {
            const Icon = m.icon;
            return (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.07 }}
                className="bg-slate-50 border border-slate-100 rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={14} className="text-purple-500" />
                  <span className="text-xs text-slate-500">{m.label}</span>
                </div>
                <p className={`text-lg font-bold ${m.colorClass ? m.colorClass.replace("text-emerald-400","text-emerald-600").replace("text-yellow-400","text-yellow-600").replace("text-red-400","text-red-600") : "text-slate-900"}`}>{m.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{m.sub}</p>
              </motion.div>
            );
          })}
        </div>
      )}

      {data && (
        <p className="mt-4 text-xs text-slate-400 text-right">
          Generated: {new Date(data.generatedAt).toLocaleTimeString()}
        </p>
      )}
    </motion.div>
  );
}
