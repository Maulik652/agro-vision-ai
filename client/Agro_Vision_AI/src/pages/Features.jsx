import { motion } from "framer-motion";
import {
  Leaf,
  Droplets,
  BarChart3,
  BellRing,
  Brain,
  ShieldCheck,
} from "lucide-react";

export default function Features() {
  const features = [
    {
      icon: Leaf,
      title: "Smart Crop Monitoring",
      desc: "Track crop health and growth patterns using real-time AI-powered analytics.",
    },
    {
      icon: Droplets,
      title: "AI Smart Irrigation",
      desc: "Optimize water usage with intelligent scheduling based on soil and weather data.",
    },
    {
      icon: BarChart3,
      title: "Yield Prediction",
      desc: "Forecast agricultural output using predictive machine learning models.",
    },
    {
      icon: BellRing,
      title: "Smart Alerts System",
      desc: "Instant alerts for weather risks, crop diseases, and irrigation needs.",
    },
    {
      icon: Brain,
      title: "AI Farming Insights",
      desc: "Make data-driven farming decisions backed by advanced AI intelligence.",
    },
    {
      icon: ShieldCheck,
      title: "Secure Data Platform",
      desc: "Enterprise-grade security to protect farm analytics and operations.",
    },
  ];

  return (
    <>
  
        <title>Features | Smart Agriculture</title>
        <meta
          name="description"
          content="Explore AI-powered smart farming features including irrigation, crop monitoring, and yield prediction."
        />
    

      <div className="min-h-screen bg-[#F8FAF5] px-6 md:px-16 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Powerful Features for
            <span className="text-[#14532D]"> Smart Agriculture</span>
          </h1>

          <p className="text-slate-600 text-lg">
            AI-driven agriculture management designed to increase productivity
            and reduce operational costs.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <motion.div
                key={index}
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition duration-300 border"
              >
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                  <Icon className="text-green-700" size={24} />
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
    </>
  );
}