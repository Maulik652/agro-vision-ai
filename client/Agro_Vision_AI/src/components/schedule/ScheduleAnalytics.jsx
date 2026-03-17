import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, Calendar, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { fetchScheduleAnalytics } from "../../api/scheduleApi";

const STAT_CARDS = [
  { key: "totalEvents",        label: "Total Events",    icon: Calendar,      color: "text-blue-600",    bg: "bg-blue-50"    },
  { key: "completedEvents",    label: "Completed",       icon: CheckCircle2,  color: "text-emerald-600", bg: "bg-emerald-50" },
  { key: "missedAppointments", label: "Missed",          icon: AlertTriangle, color: "text-amber-600",   bg: "bg-amber-50"   },
  { key: "productivityScore",  label: "Productivity %",  icon: TrendingUp,    color: "text-violet-600",  bg: "bg-violet-50"  },
];

export default function ScheduleAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ["schedule-analytics"],
    queryFn: fetchScheduleAnalytics,
    staleTime: 60_000,
  });

  const chartData = data ? [
    { name: "Total",     value: data.totalEvents,        fill: "#3b82f6" },
    { name: "Done",      value: data.completedEvents,    fill: "#10b981" },
    { name: "Cancelled", value: data.cancelledEvents,    fill: "#f59e0b" },
    { name: "Missed",    value: data.missedAppointments, fill: "#ef4444" },
  ] : [];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-5">
      <div className="flex items-center gap-2">
        <TrendingUp size={16} className="text-green-600" />
        <h3 className="text-sm font-semibold text-slate-800">Schedule Analytics</h3>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        {STAT_CARDS.map(({ key, label, icon: Icon, color, bg }) => (
          <div key={key} className={`${bg} rounded-xl p-3 flex items-center gap-3`}>
            <Icon size={16} className={color} />
            <div>
              <p className="text-[10px] text-slate-500">{label}</p>
              <p className={`text-lg font-bold ${color}`}>
                {isLoading ? "—" : (data?.[key] ?? 0)}{key === "productivityScore" ? "%" : ""}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      {!isLoading && chartData.length > 0 && (
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barSize={28}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }}
                cursor={{ fill: "#f1f5f9" }}
              />
              <Bar dataKey="value" radius={[6,6,0,0]}>
                {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Task stats */}
      {data && (
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
          <span>Tasks: {data.completedTasks}/{data.totalTasks} done</span>
          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${data.totalTasks > 0 ? (data.completedTasks / data.totalTasks) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
