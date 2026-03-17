import React from "react";
import { Star, MessageSquare, ThumbsUp, AlertTriangle } from "lucide-react";

const cards = [
  { key: "totalReviews",    label: "Total Reviews",    icon: MessageSquare, color: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", sub: "text-emerald-600" } },
  { key: "avgRating",       label: "Average Rating",   icon: Star,          color: { bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-800",   sub: "text-amber-600"   } },
  { key: "fiveStarPct",     label: "5★ Reviews",       icon: ThumbsUp,      color: { bg: "bg-blue-50",    border: "border-blue-200",    text: "text-blue-800",    sub: "text-blue-600"    } },
  { key: "reportedReviews", label: "Flagged Reviews",  icon: AlertTriangle, color: { bg: "bg-rose-50",    border: "border-rose-200",    text: "text-rose-800",    sub: "text-rose-600"    } },
];

const fmt = { totalReviews: v => v.toLocaleString(), avgRating: v => `${v} / 5`, fiveStarPct: v => `${v}%`, reportedReviews: v => v.toLocaleString() };

const ReviewOverview = ({ data, loading }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    {cards.map(({ key, label, icon: Icon, color }) => (
      <div key={key} className={`rounded-2xl p-5 border ${color.border} ${color.bg}`}>
        {loading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-7 w-20 rounded-lg bg-white/60" />
            <div className="h-3 w-16 rounded bg-white/40" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <Icon size={16} className={color.sub} />
            </div>
            <p className={`text-2xl font-bold ${color.text}`}>{fmt[key](data?.[key] || 0)}</p>
            <p className={`text-xs mt-1 ${color.sub}`}>{label}</p>
          </>
        )}
      </div>
    ))}
  </div>
);

export default ReviewOverview;
