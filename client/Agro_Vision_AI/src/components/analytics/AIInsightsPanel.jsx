/**
 * AIInsightsPanel — displays rule-based AI insights from buyer order history
 */
import { motion } from "framer-motion";
import { BrainCircuit, TrendingUp, Leaf, ShoppingBag, RefreshCcw } from "lucide-react";

const ICON_MAP = { TrendingUp, Leaf, ShoppingBag };

const TYPE_COLORS = {
  spending: "bg-blue-50 border-blue-100 text-blue-700",
  crop:     "bg-green-50 border-green-100 text-green-700",
  behavior: "bg-amber-50 border-amber-100 text-amber-700",
};

export default function AIInsightsPanel({ data, isLoading, onRefresh }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center">
            <BrainCircuit size={16} className="text-green-700" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">AI Insights</h3>
            <p className="text-xs text-slate-400">Based on your order history</p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition disabled:opacity-50"
        >
          <RefreshCcw size={13} className={`text-slate-500 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {(data?.insights ?? []).map((insight, i) => {
            const Icon = ICON_MAP[insight.icon] ?? BrainCircuit;
            const colorClass = TYPE_COLORS[insight.type] ?? TYPE_COLORS.behavior;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`flex gap-3 rounded-xl border p-4 ${colorClass}`}
              >
                <Icon size={16} className="shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold mb-0.5">{insight.title}</p>
                  <p className="text-xs leading-relaxed opacity-90">{insight.message}</p>
                </div>
              </motion.div>
            );
          })}
          {!data?.insights?.length && (
            <p className="text-sm text-slate-400 text-center py-6">
              Place some orders to unlock AI insights.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
