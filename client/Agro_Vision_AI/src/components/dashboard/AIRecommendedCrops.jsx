import React from "react";
import { motion } from "framer-motion";
import { CheckBadge, ArrowRight } from "lucide-react";

const AIRecommendedCrops = ({ recommendations = [] }) => {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-5 shadow-xl"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">AI Recommended Crops</h2>
        <span className="text-xs text-slate-300">Based on demand, volatility and availability</span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {recommendations.length ? recommendations.map((item) => (
          <article key={item.crop_name} className="rounded-xl border border-white/15 bg-slate-950/30 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">{item.crop_name}</h3>
              <span className="text-xs text-emerald-300">{item.risk_indicator}</span>
            </div>

            <p className="text-sm text-slate-300">Demand score: {item.demand_score}</p>
            <p className="text-sm text-slate-300">Predicted price: Rs {item.predicted_price}</p>
            <p className="text-xs text-slate-400">Volatility: {item.volatility_score}%</p>

            <div className="mt-3 flex items-center justify-between">
              <button className="rounded-md bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400">
                View Crop
              </button>
              <CheckBadge className="h-4 w-4 text-emerald-300" />
            </div>
          </article>
        )) : (
          <div className="rounded-xl border border-white/15 bg-slate-950/30 p-4 text-sm text-slate-300">No AI recommendations available.</div>
        )}
      </div>
    </motion.section>
  );
};

export default AIRecommendedCrops;
