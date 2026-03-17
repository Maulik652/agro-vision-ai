import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Brain } from "lucide-react";

const COLORS = { positive: "#10b981", neutral: "#94a3b8", negative: "#ef4444" };

const SentimentAnalysisCard = ({ reviews = [], loading }) => {
  const counts = { positive: 0, neutral: 0, negative: 0 };
  reviews.forEach(r => { if (counts[r.sentiment] !== undefined) counts[r.sentiment]++; });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const data = Object.entries(counts).map(([k, v]) => ({ name: k, value: v, fill: COLORS[k] })).filter(d => d.value > 0);

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
          <Brain size={15} className="text-violet-700" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800">AI Sentiment Analysis</h3>
      </div>

      {loading ? (
        <div className="h-40 bg-slate-50 rounded-xl animate-pulse" />
      ) : total === 0 ? (
        <p className="text-slate-400 text-sm text-center py-8">No analyzed reviews</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [`${v} reviews`, n]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {Object.entries(counts).map(([k, v]) => (
              <div key={k} className="text-center">
                <div className="w-2.5 h-2.5 rounded-full mx-auto mb-1" style={{ background: COLORS[k] }} />
                <p className="text-xs font-semibold text-slate-700">{total > 0 ? Math.round((v / total) * 100) : 0}%</p>
                <p className="text-[10px] text-slate-400 capitalize">{k}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default SentimentAnalysisCard;
