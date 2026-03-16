import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const fmtCurrency = (v) =>
  `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(v || 0))}`;

const MoneyTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl text-sm">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      <p className="text-emerald-700 font-bold">{fmtCurrency(payload[0]?.value)}</p>
    </div>
  );
};

const PurchasesTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl text-sm">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      <p className="text-emerald-600 font-bold">{payload[0]?.value} orders</p>
    </div>
  );
};

const SpendingAnalytics = ({ spending, isLoading }) => {
  const monthly = Array.isArray(spending?.monthlySpending) ? spending.monthlySpending : [];
  const weekly = Array.isArray(spending?.weeklyPurchases) ? spending.weeklyPurchases : [];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="inline-flex rounded-xl bg-slate-100 p-2.5">
          <BarChart3 size={18} className="text-slate-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Spending Analytics</h2>
          <p className="text-sm text-slate-500">Monthly spending trends and weekly purchase activity</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="h-56 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-56 animate-pulse rounded-xl bg-slate-100" />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {/* Monthly Spending */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3">Monthly Spending (12 months)</p>
            {monthly.length ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#15803d" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#15803d" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<MoneyTooltip />} />
                    <Line type="monotone" dataKey="spending" stroke="#15803d" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "#15803d", stroke: "#fff", strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-400">
                No monthly data available
              </div>
            )}
          </div>

          {/* Weekly Purchases */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3">Weekly Purchases (8 weeks)</p>
            {weekly.length ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <Tooltip content={<PurchasesTooltip />} />
                    <Bar dataKey="purchases" fill="#10b981" radius={[6, 6, 0, 0]} name="Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-400">
                No weekly data available
              </div>
            )}
          </div>
        </div>
      )}
    </motion.section>
  );
};

export default SpendingAnalytics;
