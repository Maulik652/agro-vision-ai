import React from "react";
import { DollarSign, TrendingUp, Users, Clock, RotateCcw } from "lucide-react";

const cards = [
  { key: "totalRevenue",         label: "Total Revenue",         icon: DollarSign, fmt: v => `₹${v.toLocaleString()}`, color: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", sub: "text-emerald-600", icon: "text-emerald-600" } },
  { key: "consultationRevenue",  label: "Advisory Payments",     icon: TrendingUp, fmt: v => `₹${v.toLocaleString()}`, color: { bg: "bg-violet-50",  border: "border-violet-200",  text: "text-violet-800",  sub: "text-violet-600",  icon: "text-violet-600"  } },
  { key: "farmerPayouts",        label: "Farmer Payouts",        icon: Users,      fmt: v => `₹${v.toLocaleString()}`, color: { bg: "bg-blue-50",    border: "border-blue-200",    text: "text-blue-800",    sub: "text-blue-600",    icon: "text-blue-600"    } },
  { key: "pendingAmount",        label: "Pending Payments",      icon: Clock,      fmt: v => `₹${v.toLocaleString()}`, color: { bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-800",   sub: "text-amber-600",   icon: "text-amber-600"   } },
  { key: "refundedAmount",       label: "Refunds",               icon: RotateCcw,  fmt: v => `₹${v.toLocaleString()}`, color: { bg: "bg-rose-50",    border: "border-rose-200",    text: "text-rose-800",    sub: "text-rose-600",    icon: "text-rose-600"    } },
];

const Skeleton = () => (
  <div className="rounded-2xl p-5 border border-slate-200 bg-slate-50 space-y-2 animate-pulse">
    <div className="h-7 w-28 rounded-lg bg-slate-200" />
    <div className="h-3 w-20 rounded bg-slate-200" />
  </div>
);

const EarningsOverview = ({ data, loading }) => {
  if (loading) return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((_, i) => <Skeleton key={i} />)}
    </div>
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map(({ key, label, icon: Icon, fmt, color }) => (
        <div key={key} className={`rounded-2xl p-5 border ${color.border} ${color.bg}`}>
          <div className="flex items-center justify-between mb-2">
            <Icon size={16} className={color.icon} />
          </div>
          <p className={`text-2xl font-bold ${color.text}`}>{fmt(data?.[key] || 0)}</p>
          <p className={`text-xs mt-1 ${color.sub}`}>{label}</p>
          {key === "pendingAmount" && data?.pendingCount > 0 && (
            <p className={`text-[11px] mt-0.5 ${color.sub} opacity-70`}>{data.pendingCount} pending</p>
          )}
          {key === "consultationRevenue" && data?.totalConsultations > 0 && (
            <p className={`text-[11px] mt-0.5 ${color.sub} opacity-70`}>{data.totalConsultations} consultations</p>
          )}
          {key === "refundedAmount" && data?.refundedCount > 0 && (
            <p className={`text-[11px] mt-0.5 ${color.sub} opacity-70`}>{data.refundedCount} refunds</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default EarningsOverview;
