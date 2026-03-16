import { motion } from "framer-motion";
import { Shield, Award, Leaf, Droplets, TrendingUp, Zap, AlertCircle, CheckCircle, Info } from "lucide-react";

const MetricRow = ({ icon, label, value, colorClass = "text-slate-700", bar, barColor }) => (
  <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
    <div className="flex items-center gap-2.5">
      <div className={colorClass}>{icon}</div>
      <span className="text-slate-600 text-sm">{label}</span>
    </div>
    <div className="flex items-center gap-3">
      {bar != null && (
        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${bar}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className={`h-full rounded-full ${barColor ?? "bg-green-500"}`}
          />
        </div>
      )}
      <span className={`font-semibold text-sm capitalize min-w-[60px] text-right ${colorClass}`}>{value}</span>
    </div>
  </div>
);

export default function QualityMetrics({ crop }) {
  if (!crop) return null;

  const grade = crop.grade ?? "B";
  const gradeColor = grade === "A" ? "text-emerald-700" : grade === "B" ? "text-amber-700" : "text-red-600";
  const demand = crop.aiSellReadiness ?? 60;
  const demandBar = demand >= 70 ? "bg-emerald-500" : demand >= 45 ? "bg-amber-500" : "bg-red-400";
  const demandColor = demand >= 70 ? "text-emerald-700" : demand >= 45 ? "text-amber-700" : "text-red-600";
  const urgencyColor = crop.aiUrgency === "HIGH" ? "text-red-600" : crop.aiUrgency === "MEDIUM" ? "text-amber-700" : "text-emerald-700";

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
      <h3 className="text-slate-800 font-semibold text-sm flex items-center gap-2 mb-4">
        <Shield size={15} className="text-green-700" /> Crop Quality Metrics
      </h3>

      <MetricRow icon={<Award size={14} />} label="Quality Grade" value={`Grade ${grade}`} colorClass={gradeColor} />
      <MetricRow icon={<Leaf size={14} />} label="Quality Type" value={crop.qualityType ?? "normal"}
        colorClass={crop.qualityType === "organic" ? "text-emerald-700" : "text-slate-600"} />
      {crop.moisturePercent != null && (
        <MetricRow icon={<Droplets size={14} />} label="Moisture Level" value={`${crop.moisturePercent}%`}
          colorClass="text-blue-600" bar={crop.moisturePercent} barColor="bg-blue-500" />
      )}
      <MetricRow icon={<TrendingUp size={14} />} label="AI Demand Score" value={`${demand}%`}
        colorClass={demandColor} bar={demand} barColor={demandBar} />
      {crop.aiSellReadiness != null && (
        <MetricRow icon={<Zap size={14} />} label="AI Sell Readiness" value={`${crop.aiSellReadiness}%`}
          colorClass="text-green-700" bar={crop.aiSellReadiness} barColor="bg-green-500" />
      )}
      {crop.aiUrgency && (
        <MetricRow icon={<AlertCircle size={14} />} label="Market Urgency" value={crop.aiUrgency} colorClass={urgencyColor} />
      )}
      {crop.aiConfidence != null && (
        <MetricRow icon={<CheckCircle size={14} />} label="AI Confidence" value={`${crop.aiConfidence}%`}
          colorClass="text-violet-700" bar={crop.aiConfidence} barColor="bg-violet-500" />
      )}

      {/* AI Price Band */}
      {crop.aiPriceBand?.ideal && (
        <div className="mt-4 pt-4 border-t border-slate-100 bg-green-50 border border-green-100 rounded-xl p-3">
          <p className="text-slate-500 text-xs mb-3 flex items-center gap-1.5">
            <Info size={11} className="text-green-700" /> AI Recommended Price Band
          </p>
          <div className="flex items-center justify-between">
            <div className="text-center">
              <p className="text-slate-400 text-[10px]">Floor</p>
              <p className="text-slate-700 font-semibold text-sm">₹{crop.aiPriceBand.min}</p>
            </div>
            <div className="flex-1 mx-3 h-1.5 bg-slate-200 rounded-full relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-green-500 to-amber-400 rounded-full" />
            </div>
            <div className="text-center">
              <p className="text-green-700 text-[10px] font-semibold">Ideal</p>
              <p className="text-green-700 font-bold text-base">₹{crop.aiPriceBand.ideal}</p>
            </div>
            <div className="flex-1 mx-3 h-1.5 bg-slate-200 rounded-full relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-green-400 via-amber-400 to-red-400 rounded-full" />
            </div>
            <div className="text-center">
              <p className="text-slate-400 text-[10px]">Ceiling</p>
              <p className="text-slate-700 font-semibold text-sm">₹{crop.aiPriceBand.max}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
