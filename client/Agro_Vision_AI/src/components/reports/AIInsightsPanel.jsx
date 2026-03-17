import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, RefreshCw, Lightbulb } from "lucide-react";

const AIInsightsPanel = ({ insights = [], loading, onRefresh }) => (
  <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
          <Sparkles size={14} className="text-emerald-600" />
        </div>
        <h3 className="font-semibold text-slate-800 text-sm">AI Insights</h3>
      </div>
      <button onClick={onRefresh} disabled={loading}
        className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-emerald-600 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-40 border border-transparent hover:border-emerald-200">
        <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
        {loading ? "Generating..." : "Generate"}
      </button>
    </div>

    <div className="p-5">
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="flex gap-3">
              <div className="w-5 h-5 rounded-full bg-slate-100 animate-pulse shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-slate-100 rounded animate-pulse" />
                <div className="h-3 bg-slate-100 rounded animate-pulse w-4/5" />
              </div>
            </div>
          ))}
        </div>
      ) : insights.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-slate-400">
          <Lightbulb size={28} className="mb-2 opacity-30" />
          <p className="text-xs font-medium">No insights yet</p>
          <p className="text-[11px] mt-1 text-center">Click Generate to get AI-powered analysis of your platform data</p>
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-3">
            {insights.map((insight, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                className="flex gap-3 p-3 bg-gradient-to-r from-emerald-50 to-transparent border border-emerald-100 rounded-xl">
                <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 text-[10px] flex items-center justify-center shrink-0 font-bold mt-0.5">{i + 1}</span>
                <p className="text-xs text-slate-700 leading-relaxed">{insight}</p>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  </div>
);

export default AIInsightsPanel;
