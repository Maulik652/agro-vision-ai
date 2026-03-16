import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const DAY_OPTIONS = [
  { value: 30, label: "30D" },
  { value: 60, label: "60D" },
  { value: 90, label: "90D" }
];

const fmt = (v) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Number(v || 0));

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl text-sm">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      <p className="text-emerald-600 font-bold">₹{fmt(payload[0]?.value)}</p>
    </div>
  );
};

const PriceTrendChart = ({
  data,
  isLoading,
  selectedCrop,
  onCropChange,
  selectedDays,
  onDaysChange
}) => {
  const points = Array.isArray(data?.points) ? data.points : [];
  const availableCrops = Array.isArray(data?.availableCrops) ? data.availableCrops : [];
  const changePercent = Number(data?.summary?.changePercent || 0);
  const isPositive = changePercent >= 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
    >
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Live Market Price Trends</h2>
          <p className="text-sm text-slate-500 mt-0.5">Real-time crop price history from market data</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedCrop || data?.crop || ""}
            onChange={(e) => onCropChange?.(e.target.value)}
            disabled={isLoading || !availableCrops.length}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition"
          >
            {(availableCrops.length ? availableCrops : [data?.crop || "Wheat"]).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <div className="inline-flex rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
            {DAY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onDaysChange?.(opt.value)}
                className={`px-3 py-2 text-sm font-semibold transition ${
                  Number(selectedDays) === opt.value
                    ? "bg-emerald-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary stats */}
      {!isLoading && points.length > 0 && (
        <div className="mb-5 grid grid-cols-3 gap-3">
          {[
            { label: "Current Price", value: `₹${fmt(data?.summary?.currentPrice)}` },
            { label: "Average Price", value: `₹${fmt(data?.summary?.averagePrice)}` },
            {
              label: "Price Change",
              value: `${isPositive ? "+" : ""}${fmt(changePercent)}%`,
              colored: true
            }
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{stat.label}</p>
              <p className={`text-lg font-bold ${stat.colored ? (isPositive ? "text-emerald-700" : "text-red-600") : "text-slate-900"}`}>
                {stat.colored && (
                  <span className="inline-flex items-center gap-1">
                    {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {stat.value}
                  </span>
                )}
                {!stat.colored && stat.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      {isLoading ? (
        <div className="h-72 animate-pulse rounded-xl bg-slate-100" />
      ) : points.length ? (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#priceGradient)"
                dot={false}
                activeDot={{ r: 5, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-72 flex items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-400">
          No trend data available for the selected crop and period.
        </div>
      )}
    </motion.section>
  );
};

export default PriceTrendChart;
