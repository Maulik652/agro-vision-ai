import React, { useMemo, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

const periodOptions = [30, 60, 90];

const PriceTrendChart = ({ trendData = { data: [] }, onSelectCrop, selectedCrop, onRangeChange }) => {
  const [days, setDays] = useState(30);

  const data = useMemo(() => {
    return trendData.data.map((item) => ({
      date: new Date(item.date).toLocaleDateString("en-GB", { month: "short", day: "numeric" }),
      price: Number(item.price)
    }));
  }, [trendData.data]);

  const handleDays = (value) => {
    setDays(value);
    onRangeChange(value);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-5 shadow-xl"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Crop Price Trend</h2>
          <p className="text-sm text-slate-300">Analyze price movements and volatility from real trading data.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedCrop}
            onChange={(e) => onSelectCrop(e.target.value)}
            className="rounded-lg border border-white/25 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none"
          >
            {trendData.availableCrops?.map((crop) => (
              <option key={crop} value={crop}>{crop}</option>
            ))}
          </select>
          {periodOptions.map((option) => (
            <button
              key={option}
              onClick={() => handleDays(option)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${option === days ? "bg-emerald-500 text-white" : "bg-white/10 text-slate-100"}`}
            >
              {option}d
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" />
            <XAxis dataKey="date" stroke="#DDD" tickLine={false} />
            <YAxis stroke="#DDD" tickLine={false} />
            <Tooltip contentStyle={{ backgroundColor: "#12263f", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10 }} />
            <Area type="monotone" dataKey="price" stroke="#22c55e" fill="rgba(34,197,94,0.25)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.section>
  );
};

export default PriceTrendChart;
