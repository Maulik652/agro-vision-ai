/**
 * AIPredictionPanel — Stacked ensemble AI crop demand predictions
 * Shows: price forecast, demand score, 7-week trend sparkline,
 *        buy signal, risk level, confidence badge.
 */
import { motion } from "framer-motion";
import { Sparkles, RefreshCcw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  LineChart, Line, ResponsiveContainer, Tooltip as RechartTooltip,
} from "recharts";

const fmt = (v) =>
  v != null
    ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v)
    : "—";

const BUY_CONFIG = {
  "Buy Now":   { bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500"  },
  "Good Time": { bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500"   },
  "Neutral":   { bg: "bg-slate-100",  text: "text-slate-600",  dot: "bg-slate-400"  },
  "Wait":      { bg: "bg-red-100",    text: "text-red-700",    dot: "bg-red-500"    },
};

const RISK_CONFIG = {
  Low:    "text-green-600 bg-green-50 border-green-200",
  Medium: "text-amber-600 bg-amber-50 border-amber-200",
  High:   "text-red-600 bg-red-50 border-red-200",
};

/* Mini sparkline from trendSeries */
const Sparkline = ({ series }) => {
  if (!series?.length) return null;
  const data = series.map((v, i) => ({ w: `W${i + 1}`, v }));
  return (
    <ResponsiveContainer width="100%" height={36}>
      <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke="#7c3aed"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
        <RechartTooltip
          content={({ active, payload }) =>
            active && payload?.length ? (
              <div className="bg-white border border-slate-100 rounded-lg px-2 py-1 text-xs shadow">
                {fmt(payload[0].value)}/kg
              </div>
            ) : null
          }
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

/* Demand progress bar */
const DemandBar = ({ score }) => {
  const pct   = Math.min(100, Math.max(0, score ?? 0));
  const color = pct >= 70 ? "bg-red-500" : pct >= 45 ? "bg-amber-500" : "bg-green-500";
  return (
    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.9 }}
        className={`h-full rounded-full ${color}`}
      />
    </div>
  );
};

/* Price change indicator */
const PriceChange = ({ pct }) => {
  if (pct == null) return null;
  const up = pct >= 0;
  const Icon = pct === 0 ? Minus : up ? TrendingUp : TrendingDown;
  return (
    <span className={`flex items-center gap-0.5 text-xs font-semibold ${up ? "text-red-500" : "text-green-600"}`}>
      <Icon size={11} />
      {Math.abs(pct)}%
    </span>
  );
};

export default function AIPredictionPanel({ data, isLoading, onRefresh }) {
  const source = data?.source;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center">
            <Sparkles size={16} className="text-purple-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">AI Predictions</h3>
            <p className="text-xs text-slate-400">
              {source === "ensemble_v2"
                ? "Stacked ensemble · XGBoost + RF + Ridge"
                : "30-day demand forecast"}
            </p>
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

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 rounded-xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {(data?.predictions ?? []).map((pred, i) => {
            const buy  = BUY_CONFIG[pred.buySignal] ?? BUY_CONFIG["Neutral"];
            const risk = RISK_CONFIG[pred.riskLevel] ?? RISK_CONFIG["Medium"];

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3"
              >
                {/* Row 1: crop name + badges */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm font-bold text-slate-800 capitalize">{pred.crop}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Buy signal */}
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${buy.bg} ${buy.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${buy.dot}`} />
                      {pred.buySignal}
                    </span>
                    {/* Risk */}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${risk}`}>
                      {pred.riskLevel} Risk
                    </span>
                    {/* Confidence */}
                    {pred.confidence != null && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                        {Math.round(pred.confidence * 100)}% conf.
                      </span>
                    )}
                  </div>
                </div>

                {/* Row 2: price info */}
                <div className="flex items-end gap-4">
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Predicted (30d)</p>
                    <p className="text-lg font-bold text-slate-900">{fmt(pred.predictedPrice)}<span className="text-xs font-normal text-slate-400">/kg</span></p>
                  </div>
                  {pred.currentPrice != null && (
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Current</p>
                      <p className="text-sm font-semibold text-slate-600">{fmt(pred.currentPrice)}/kg</p>
                    </div>
                  )}
                  <div className="ml-auto">
                    <PriceChange pct={pred.priceChangePct} />
                  </div>
                </div>

                {/* Row 3: demand bar */}
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Demand Score</span>
                    <span className="font-semibold text-slate-700">{pred.demandScore}/100</span>
                  </div>
                  <DemandBar score={pred.demandScore} />
                </div>

                {/* Row 4: 7-week sparkline */}
                {pred.trendSeries?.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">7-Week Price Trend</p>
                    <Sparkline series={pred.trendSeries} />
                  </div>
                )}

                {/* Row 5: message */}
                <p className="text-xs text-slate-500 leading-relaxed">{pred.message}</p>
              </motion.div>
            );
          })}

          {!data?.predictions?.length && (
            <p className="text-sm text-slate-400 text-center py-6">
              Purchase crops to receive demand predictions.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
