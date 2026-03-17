import React from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";

const SpamDetectionPanel = ({ reviews = [], loading }) => {
  const flagged = reviews.filter(r => r.spamScore >= 0.5);
  const clean   = reviews.filter(r => r.spamScore < 0.5);
  const avgSpam = reviews.length > 0
    ? (reviews.reduce((s, r) => s + (r.spamScore || 0), 0) / reviews.length * 100).toFixed(1)
    : 0;

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center">
          <ShieldAlert size={15} className="text-rose-700" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800">Spam Detection</h3>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-8 bg-slate-50 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-rose-50 border border-rose-200 rounded-xl">
            <div className="flex items-center gap-2">
              <ShieldAlert size={14} className="text-rose-600" />
              <span className="text-xs font-semibold text-rose-700">Suspicious Reviews</span>
            </div>
            <span className="text-sm font-bold text-rose-700">{flagged.length}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700">Clean Reviews</span>
            </div>
            <span className="text-sm font-bold text-emerald-700">{clean.length}</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-xs text-slate-500">Avg Spam Score</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-rose-400 rounded-full transition-all" style={{ width: `${avgSpam}%` }} />
              </div>
              <span className="text-xs font-semibold text-slate-700">{avgSpam}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpamDetectionPanel;
