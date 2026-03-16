import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { BarChart2, TrendingUp, TrendingDown, Minus } from "lucide-react";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="text-slate-400 mb-1">{new Date(label).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
      <p className="text-green-700 font-bold">₹{payload[0]?.value?.toFixed(2)}/kg</p>
      {payload[1] && <p className="text-blue-600">Demand: {payload[1]?.value?.toFixed(0)}%</p>}
    </div>
  );
};

export default function PriceHistoryChart({ data = [], currentPrice }) {
  if (!data.length) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <h3 className="text-slate-800 font-semibold text-sm flex items-center gap-2 mb-4">
          <BarChart2 size={15} className="text-green-700" /> 14-Day Price Trend
        </h3>
        <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
          Price history not available
        </div>
      </div>
    );
  }

  const prices = data.map((d) => d.pricePerKg).filter(Boolean);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const lastP = prices[prices.length - 1];
  const firstP = prices[0];
  const change = firstP ? ((lastP - firstP) / firstP) * 100 : 0;
  const rising = change > 0.5;
  const falling = change < -0.5;

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-800 font-semibold text-sm flex items-center gap-2">
          <BarChart2 size={15} className="text-green-700" /> 14-Day Price Trend
        </h3>
        <div className={`flex items-center gap-1 text-xs font-semibold ${rising ? "text-emerald-600" : falling ? "text-red-500" : "text-amber-600"}`}>
          {rising ? <TrendingUp size={13} /> : falling ? <TrendingDown size={13} /> : <Minus size={13} />}
          {change > 0 ? "+" : ""}{change.toFixed(1)}%
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "14-Day Low", value: `₹${minP.toFixed(2)}`, color: "text-red-500" },
          { label: "Current", value: `₹${(currentPrice ?? lastP).toFixed(2)}`, color: "text-slate-800" },
          { label: "14-Day High", value: `₹${maxP.toFixed(2)}`, color: "text-green-700" },
        ].map((s, i) => (
          <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
            <p className="text-slate-400 text-[10px] mb-1">{s.label}</p>
            <p className={`font-bold text-sm ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#15803d" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#15803d" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="demandGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.12} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" />
          <XAxis dataKey="date" tick={{ fill: "rgba(100,116,139,0.8)", fontSize: 10 }}
            tickFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} />
          <YAxis tick={{ fill: "rgba(100,116,139,0.8)", fontSize: 10 }}
            tickFormatter={(v) => `₹${v}`} />
          <Tooltip content={<CustomTooltip />} />
          {currentPrice && (
            <ReferenceLine y={currentPrice} stroke="rgba(100,116,139,0.4)" strokeDasharray="4 4"
              label={{ value: "Current", fill: "rgba(100,116,139,0.6)", fontSize: 10 }} />
          )}
          <Area type="monotone" dataKey="pricePerKg" stroke="#15803d" strokeWidth={2}
            fill="url(#priceGrad)" dot={false} activeDot={{ r: 4, fill: "#15803d" }} />
          {data[0]?.demandScore != null && (
            <Area type="monotone" dataKey="demandScore" stroke="#2563eb" strokeWidth={1.5}
              fill="url(#demandGrad)" dot={false} activeDot={{ r: 3, fill: "#2563eb" }} />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
