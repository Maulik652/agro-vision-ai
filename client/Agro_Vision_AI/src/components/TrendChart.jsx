import React, { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const formatLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value || "");
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short"
  });
};

const TrendChart = ({ trends = [], title = "Market Trend" }) => {
  const chartData = useMemo(() => {
    return trends.map((row) => ({
      date: formatLabel(row.date),
      price: Number(row.pricePerKg || 0),
      demand: Number(row.demandScore || 0),
      volume: Number(row.volume || 0)
    }));
  }, [trends]);

  return (
    <section className="rounded-3xl border border-[#d7edd8] bg-white p-4 shadow-[0_14px_30px_-25px_rgba(30,92,40,0.64)]">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#1f4e2a]">{title}</h3>
        <span className="rounded-full bg-[#e8f5e9] px-3 py-1 text-xs font-semibold text-[#2f7040]">Price + Demand</span>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer>
          <AreaChart data={chartData} margin={{ top: 12, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4caf50" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#4caf50" stopOpacity={0.04} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#e1f0e3" />
            <XAxis dataKey="date" tick={{ fill: "#54745b", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="price" tick={{ fill: "#54745b", fontSize: 12 }} axisLine={false} tickLine={false} width={45} />
            <YAxis yAxisId="demand" orientation="right" tick={{ fill: "#54745b", fontSize: 12 }} axisLine={false} tickLine={false} width={42} />

            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #d5e8d8",
                background: "#fafffa"
              }}
            />

            <Area
              yAxisId="price"
              type="monotone"
              dataKey="price"
              stroke="#2e7d32"
              strokeWidth={2.2}
              fill="url(#priceGradient)"
              activeDot={{ r: 4 }}
            />

            <Line
              yAxisId="demand"
              type="monotone"
              dataKey="demand"
              stroke="#f9a825"
              strokeWidth={2.3}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};

export default TrendChart;
