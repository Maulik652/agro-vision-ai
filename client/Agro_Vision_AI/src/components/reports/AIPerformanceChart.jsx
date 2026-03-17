import React, { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Brain, TrendingDown, Target } from "lucide-react";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: p.color }} />{p.name}</span>
          <span className="font-semibold">{p.name === "Confidence" ? `${p.value}%` : `₹${p.value}`}</span>
        </div>
      ))}
    </div>
  );
};

const AIPerformanceChart = ({ data = [], loading }) => {
  const { chartData, avgError, avgConf } = useMemo(() => {
    const byDate = {};
    data.forEach(({ date, predicted, actual, confidence, errorRate }) => {
      if (!byDate[date]) byDate[date] = { date, _p: [], _a: [], _c: [], _e: [] };
      byDate[date]._p.push(predicted);
      byDate[date]._a.push(actual);
      byDate[date]._c.push(confidence);
      byDate[date]._e.push(errorRate);
    });
    const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 100) / 100 : 0;
    const cd = Object.values(byDate).map(d => ({
      date: d.date,
      Predicted: avg(d._p),
      Actual: avg(d._a),
      Confidence: avg(d._c)
    })).sort((a, b) => a.date.localeCompare(b.date));

    const allErrors = data.map(d => d.errorRate).filter(Boolean);
    const allConf   = data.map(d => d.confidence).filter(Boolean);
    return {
      chartData: cd,
      avgError: allErrors.length ? (allErrors.reduce((a, b) => a + b, 0) / allErrors.length).toFixed(1) : 0,
      avgConf:  allConf.length  ? (allConf.reduce((a, b) => a + b, 0)   / allConf.length).toFixed(1)   : 0
    };
  }, [data]);

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-rose-600" />
          <h3 className="font-semibold text-slate-800 text-sm">AI Price Prediction Performance</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-rose-600 bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg">
            <TrendingDown size={11} /> Avg Error: {avgError}%
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
            <Target size={11} /> Confidence: {avgConf}%
          </div>
        </div>
      </div>
      <div className="p-6">
        {loading ? (
          <div className="h-72 bg-slate-50 rounded-xl animate-pulse" />
        ) : chartData.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-slate-400">
            <Brain size={32} className="mb-2 opacity-20" />
            <p className="text-sm">No AI performance data</p>
            <p className="text-xs mt-1">Requires crop listings with AI suggested prices</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={d => d.slice(5)} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={v => `₹${v}`} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
              <Line type="monotone" dataKey="Predicted" stroke="#3b82f6" strokeWidth={2} dot={false} strokeDasharray="5 3" activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="Actual"    stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default AIPerformanceChart;
