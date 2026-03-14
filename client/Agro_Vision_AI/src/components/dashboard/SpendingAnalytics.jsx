import React from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#0ea5e9", "#8b5cf6", "#22c55e", "#f97316", "#eab308", "#db2777", "#14b8a6"];

const SpendingAnalytics = ({ monthlySpending = [], categoryBreakdown = [] }) => {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="grid gap-4 md:grid-cols-2"
    >
      <article className="rounded-2xl border border-white/20 bg-white/10 p-5 shadow-xl">
        <h2 className="text-lg font-bold text-white">Monthly Spending</h2>
        <div className="h-60 mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlySpending}>
              <XAxis dataKey="month" tick={{ fill: "#e2e8f0", fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 8 }} />
              <Bar dataKey="spend" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="rounded-2xl border border-white/20 bg-white/10 p-5 shadow-xl">
        <h2 className="text-lg font-bold text-white">Category Breakdown</h2>
        <div className="h-60 mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={categoryBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={42}>
                {categoryBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </article>
    </motion.section>
  );
};

export default SpendingAnalytics;
