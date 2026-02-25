import React from "react";
import { motion } from "framer-motion";
import {
  Leaf,
  Brain,
  Droplets,
  Sun,
  AlertTriangle,
  ScanLine,
  BarChart3,
  ShoppingCart,
  Home,
  User,
  Settings
} from "lucide-react";

import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip
} from "recharts";

const data = [
  { day: "Mon", health: 65 },
  { day: "Tue", health: 72 },
  { day: "Wed", health: 68 },
  { day: "Thu", health: 80 },
  { day: "Fri", health: 92 },
];

const FarmerDashboard = () => {
  return (
    <div className="min-h-screen bg-linear-to-br from-green-50 via-white to-emerald-50 flex">

      {/* ===== Sidebar ===== */}
      <div className="w-64 bg-white border-r border-green-100 p-6 hidden md:flex flex-col">
        <h1 className="text-2xl font-bold text-green-800 mb-10">
          AgroVision_AI
        </h1>

        <nav className="space-y-3">
          <SidebarItem icon={Home} label="Dashboard" active />
          <SidebarItem icon={Leaf} label="My Crops" />
          <SidebarItem icon={Brain} label="AI Advisory" />
          <SidebarItem icon={ShoppingCart} label="Buyers" />
          <SidebarItem icon={BarChart3} label="Analytics" />
          <SidebarItem icon={Settings} label="Settings" />
        </nav>

        <div className="mt-auto">
          <SidebarItem icon={User} label="Profile" />
        </div>
      </div>

      {/* ===== Main Content ===== */}
      <div className="flex-1 p-6">

        {/* ===== Header ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-6"
        >
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Welcome Back, Maulik 🌿
            </h2>
            <p className="text-slate-500 text-sm">
              Farm performance overview
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-700">
                Farmer
              </p>
              <p className="text-xs text-slate-400">
                Surat, Gujarat
              </p>
            </div>

            <div className="w-10 h-10 rounded-full bg-green-700 text-white flex items-center justify-center font-semibold">
              M
            </div>
          </div>
        </motion.div>

        {/* ===== Stats ===== */}
        <div className="grid md:grid-cols-4 gap-5 mb-6">
          <StatCard icon={Leaf} title="Active Crops" value="4" delay={0.1} />
          <StatCard icon={Brain} title="AI Alerts" value="1" delay={0.2} />
          <StatCard icon={Droplets} title="Soil Moisture" value="78%" delay={0.3} />
          <StatCard icon={Sun} title="Temperature" value="29°C" delay={0.4} />
        </div>

        {/* ===== Grid Layout ===== */}
        <div className="grid md:grid-cols-3 gap-6">

          {/* AI Insight */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="md:col-span-2 bg-white/80 backdrop-blur-xl border border-green-100 shadow-md rounded-3xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <Brain className="text-green-600" />
              <h3 className="text-lg font-semibold text-slate-800">
                AI Crop Insight
              </h3>
            </div>

            <p className="text-slate-600 mb-3">
              Mild leaf stress detected in <span className="font-medium">Cotton</span>.
            </p>

            <Progress confidence={87} />

            <button className="mt-4 px-5 py-2 bg-[#14532D] text-white rounded-xl text-sm hover:opacity-90 transition">
              View Full Analysis
            </button>
          </motion.div>

          {/* Alerts */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-yellow-50 border border-yellow-200 rounded-3xl p-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="text-yellow-600" size={20} />
              <h3 className="font-semibold text-slate-800">
                Smart Alerts
              </h3>
            </div>

            <p className="text-sm text-slate-600">
              Irrigation recommended tomorrow.
            </p>

            <p className="text-sm text-slate-600 mt-2">
              Rain probability high (60%).
            </p>
          </motion.div>

          {/* Performance Chart */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="md:col-span-3 bg-white/80 backdrop-blur-xl border border-green-100 shadow-md rounded-3xl p-6"
          >
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              Crop Health Trend
            </h3>

            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="health"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

        </div>

        {/* ===== Quick Actions ===== */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white/80 backdrop-blur-xl border border-green-100 shadow-md rounded-3xl p-6 mt-6"
        >
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            Quick Actions
          </h3>

          <div className="grid md:grid-cols-4 gap-4">
            <ActionButton icon={ScanLine} label="Scan Crop" />
            <ActionButton icon={Brain} label="AI Advisory" />
            <ActionButton icon={BarChart3} label="Analytics" />
            <ActionButton icon={ShoppingCart} label="Find Buyers" />
          </div>
        </motion.div>

      </div>
    </div>
  );
};

const SidebarItem = ({ icon: Icon, label, active }) => (
  <div
    className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition
    ${active
        ? "bg-green-100 text-green-800 font-medium"
        : "text-slate-600 hover:bg-green-50"
      }`}
  >
    <Icon size={18} />
    {label}
  </div>
);

const StatCard = ({ icon: Icon, title, value, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    whileHover={{ scale: 1.03 }}
    className="bg-white shadow-sm border border-green-100 rounded-3xl p-5"
  >
    <Icon className="text-green-600 mb-2" size={24} />
    <p className="text-sm text-slate-500">{title}</p>
    <p className="text-xl font-bold text-slate-800">{value}</p>
  </motion.div>
);

const Progress = ({ confidence }) => (
  <div>
    <div className="flex justify-between text-sm mb-1">
      <span className="text-slate-500">Confidence</span>
      <span className="text-green-600 font-medium">{confidence}%</span>
    </div>

    <div className="h-2 bg-green-100 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${confidence}%` }}
        transition={{ duration: 1 }}
        className="h-full bg-green-600"
      />
    </div>
  </div>
);

const ActionButton = ({ icon: Icon, label }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    className="flex flex-col items-center justify-center gap-2 py-4 rounded-2xl
    bg-linear-to-br from-green-100 to-green-50 border border-green-200
    hover:shadow-md transition"
  >
    <Icon className="text-green-700" size={22} />
    <span className="text-sm font-medium text-slate-700">{label}</span>
  </motion.button>
);

export default FarmerDashboard;