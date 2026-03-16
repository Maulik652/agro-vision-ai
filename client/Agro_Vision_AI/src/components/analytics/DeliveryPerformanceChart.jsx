/**
 * DeliveryPerformanceChart — Donut chart for delivery performance
 */
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Truck } from "lucide-react";

const COLORS = { onTime: "#16a34a", delayed: "#d97706", cancelled: "#dc2626" };

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-slate-700">{payload[0].name}</p>
      <p className="text-slate-500">{payload[0].value} orders</p>
    </div>
  );
};

export default function DeliveryPerformanceChart({ data, isLoading }) {
  if (isLoading) return <div className="h-64 rounded-2xl bg-slate-100 animate-pulse" />;

  const perf = data ?? { onTime: 0, delayed: 0, cancelled: 0 };
  const chartData = [
    { name: "On-time",   value: perf.onTime    },
    { name: "Delayed",   value: perf.delayed   },
    { name: "Cancelled", value: perf.cancelled },
  ].filter((d) => d.value > 0);

  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <Truck size={16} className="text-green-600" />
        <h3 className="font-bold text-slate-800 text-sm">Delivery Performance</h3>
      </div>
      {total === 0 ? (
        <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
          No delivery data yet
        </div>
      ) : (
        <div className="flex items-center gap-6">
          <ResponsiveContainer width="60%" height={180}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                dataKey="value"
                strokeWidth={0}
              >
                {chartData.map((d) => (
                  <Cell key={d.name} fill={COLORS[d.name === "On-time" ? "onTime" : d.name === "Delayed" ? "delayed" : "cancelled"]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 flex-1">
            {[
              { label: "On-time",   value: perf.onTime,    color: "bg-green-500" },
              { label: "Delayed",   value: perf.delayed,   color: "bg-amber-500" },
              { label: "Cancelled", value: perf.cancelled, color: "bg-red-500" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                <span className="text-xs text-slate-600 flex-1">{item.label}</span>
                <span className="text-xs font-bold text-slate-800">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
