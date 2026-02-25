import { motion } from "framer-motion";
import {
  Brain,
  ScanLine,
  Droplets,
  BarChart3,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export default function AIInsights() {
  const aiFeatures = [
    {
      icon: Brain,
      title: "Predictive Intelligence",
      desc: "AI analyzes historical farm data to forecast crop yield, growth trends, and productivity risks.",
    },
    {
      icon: ScanLine,
      title: "Disease Detection AI",
      desc: "Detect crop diseases early using machine learning models trained on agricultural patterns.",
    },
    {
      icon: Droplets,
      title: "Water Optimization",
      desc: "Smart algorithms determine precise irrigation schedules to minimize waste and maximize efficiency.",
    },
    {
      icon: BarChart3,
      title: "Data-Driven Decisions",
      desc: "Transform complex agricultural data into actionable insights for smarter farming strategies.",
    },
    {
      icon: ShieldCheck,
      title: "Adaptive Learning System",
      desc: "AI continuously improves recommendations by learning from farm conditions and user interactions.",
    },
    {
      icon: Sparkles,
      title: "Smart Farming Assistant",
      desc: "An intelligent assistant guiding farmers with real-time suggestions and automated alerts.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAF5] text-[#1E293B] px-6 md:px-16 py-20">

      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-3xl mx-auto mb-20"
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
          Artificial Intelligence for
          <span className="text-[#14532D]"> Smart Farming</span>
        </h1>

        <p className="text-lg text-slate-600">
          Our AI engine transforms agricultural data into intelligent predictions,
          automation, and precision decision-making.
        </p>
      </motion.div>

      {/* AI HIGHLIGHT PANEL */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative bg-white rounded-3xl p-10 md:p-14 shadow-xl mb-20 overflow-hidden"
      >
        {/* Glow Effect */}
        <div className="absolute inset-0 bg-[#22C55E]/5 blur-3xl"></div>

        <div className="relative z-10 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-4">
              Next-Generation Farm Intelligence
            </h2>

            <p className="text-slate-600 leading-relaxed">
              From yield forecasting to resource optimization, our AI models
              continuously analyze farm conditions, weather patterns, and soil data
              to enhance agricultural efficiency.
            </p>
          </div>

          <div className="bg-[#14532D] text-white rounded-2xl p-6 shadow-lg">
            <p className="text-sm text-green-200 mb-2">
              AI Processing Status
            </p>

            <p className="text-2xl font-semibold">
              Active & Learning 🚀
            </p>

            <p className="text-green-200 text-sm mt-2">
              Continuously improving predictions
            </p>
          </div>
        </div>
      </motion.div>

      {/* AI FEATURES GRID */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {aiFeatures.map((feature, index) => {
          const Icon = feature.icon;

          return (
            <motion.div
              key={index}
              whileHover={{ y: -8 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100"
            >
              <div className="w-12 h-12 rounded-xl bg-[#22C55E]/10 flex items-center justify-center mb-6">
                <Icon className="text-[#14532D]" size={24} />
              </div>

              <h3 className="text-xl font-semibold mb-3">
                {feature.title}
              </h3>

              <p className="text-slate-600 leading-relaxed">
                {feature.desc}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}