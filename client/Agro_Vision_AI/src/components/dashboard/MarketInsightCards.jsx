import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Sparkles, ChartColumnIncreasing } from "lucide-react";

const insights = [
  { key: "topDemandedCrops", label: "Top Demanded Crops", icon: TrendingUp, color: "text-emerald-500" },
  { key: "marketDemandTrend", label: "Market Demand Trend", icon: ChartColumnIncreasing, color: "text-sky-500" },
  { key: "aiPredictedPrice", label: "AI Predicted Price", icon: Sparkles, color: "text-indigo-500" },
  { key: "marketVolatilityIndicator", label: "Market Volatility", icon: TrendingDown, color: "text-amber-500" }
];

const cardMotion = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" }
  })
};

const InsightDigit = ({ value }) => (
  <p className="text-2xl font-bold text-white">{value}</p>
);

const MarketInsightCards = ({ insightsData = {} }) => {
  const { topDemandedCrops = [], marketTrend = {}, aiPredictedPrice = {}, marketVolatilityIndicator = 0 } = insightsData;

  const values = {
    topDemandedCrops: `${topDemandedCrops.slice(0, 3).map((c) => c.cropName).join(", ") || "-"}`,
    marketDemandTrend: `${marketTrend.currentDemand ?? "-"} (${marketTrend.demandChange >=0 ? "+" : ""}${marketTrend.demandChange ?? 0}%)`, 
    aiPredictedPrice: aiPredictedPrice.predictedPrice ? `Rs ${aiPredictedPrice.predictedPrice}` : "Rs 0",
    marketVolatilityIndicator: `${marketVolatilityIndicator.toFixed(1)}%`
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {insights.map((item, index) => {
        const Icon = item.icon;
        return (
          <motion.article
            key={item.key}
            custom={index}
            variants={cardMotion}
            initial="hidden"
            animate="visible"
            className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-5 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">{item.label}</h3>
              <Icon className={`${item.color} h-6 w-6`} />
            </div>
            <div className="mt-4">
              <InsightDigit value={values[item.key]} />
              <p className="mt-1 text-xs text-slate-300">Updated just now</p>
            </div>
          </motion.article>
        );
      })}
    </div>
  );
};

export default MarketInsightCards;
