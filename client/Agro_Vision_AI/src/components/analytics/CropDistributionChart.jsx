/**
 * CropDistributionChart — Pie chart of crop purchase distribution
 */
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Leaf } from "lucide-react";

const COLORS = ["#16a34a","#2563eb","#d97706","#dc2626","#7c3aed","#0891b2","#be185d","#65a30d"];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-slate-700">{d.name}</p>
      <p className="text-slate-500">{d.value} kg purchased</p>
    </div>
  );
};

export default function CropDistributionChart({ data = [], isLoading }) {
  if (isLoading) return <div className="h-64 rounded-2xl bg-slate-100 animate-pulse" />;

  const chartData = data.map((d) => ({ name: d.crop, value: d.count }));

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <Leaf size={16} className="text-green-600" />
        <h3 className="font-bold text-slate-800 text-sm">Crop Distribution</h3>
      </div>
      {chartData.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
          No crop data for this period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
