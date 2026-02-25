import { motion } from "framer-motion";
import { Leaf, Brain, ShieldCheck, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function About() {
  const navigate = useNavigate();

  const values = [
    {
      icon: Leaf,
      title: "Sustainable Innovation",
      desc: "We combine modern technology and agriculture to build efficient, eco-friendly farming systems.",
    },
    {
      icon: Brain,
      title: "AI-Driven Intelligence",
      desc: "Our artificial intelligence analyzes farm data to provide predictive insights and recommendations.",
    },
    {
      icon: BarChart3,
      title: "Data-Driven Decisions",
      desc: "Farmers gain clear, actionable insights from complex agricultural and environmental data.",
    },
    {
      icon: ShieldCheck,
      title: "Secure & Reliable",
      desc: "We ensure enterprise-level data protection, system reliability, and long-term trust.",
    },
  ];

  return (
    <>
    
        <title>About | AgroVision AI</title>
        <meta
          name="description"
          content="Learn about AgroVision AI — our mission, vision, and commitment to smart agriculture using artificial intelligence."
        />

      <div className="min-h-screen bg-[#F8FAF5] px-6 md:px-16 py-20">

        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Empowering Farmers with
            <span className="text-green-700"> Smart Agriculture</span>
          </h1>

          <p className="text-slate-600 text-lg leading-relaxed">
            AgroVision AI helps farmers improve productivity, reduce costs,
            and make smarter decisions using artificial intelligence and
            real-time agricultural insights.
          </p>
        </motion.div>

        {/* MISSION & VISION */}
        <div className="grid md:grid-cols-2 gap-10 mb-20">

          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-10 rounded-3xl shadow-sm"
          >
            <h2 className="text-2xl font-bold mb-4 text-green-700">
              🌱 Our Mission
            </h2>

            <p className="text-slate-600 leading-relaxed">
              To empower farmers with intelligent tools that improve efficiency,
              optimize resources, and enable sustainable agriculture through AI.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-10 rounded-3xl shadow-sm"
          >
            <h2 className="text-2xl font-bold mb-4 text-green-700">
              🚀 Our Vision
            </h2>

            <p className="text-slate-600 leading-relaxed">
              To build a future where farming is powered by data, automation,
              and artificial intelligence for global sustainability.
            </p>
          </motion.div>

        </div>

        {/* VALUES */}
        <div className="mb-20">

          <h2 className="text-3xl font-bold text-center mb-12">
            Why Choose AgroVision AI
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">

            {values.map((value, index) => {
              const Icon = value.icon;

              return (
                <motion.div
                  key={index}
                  whileHover={{ y: -6 }}
                  className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-lg transition"
                >
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <Icon size={20} className="text-green-700" />
                  </div>

                  <h3 className="font-semibold mb-2">
                    {value.title}
                  </h3>

                  <p className="text-sm text-slate-600">
                    {value.desc}
                  </p>
                </motion.div>
              );
            })}

          </div>
        </div>

        {/* STATS */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-green-700 text-white p-10 rounded-3xl mb-20"
        >
          <div className="grid md:grid-cols-3 text-center gap-8">

            <div>
              <h3 className="text-3xl font-bold">500+</h3>
              <p className="text-green-200">Farmers Supported</p>
            </div>

            <div>
              <h3 className="text-3xl font-bold">98%</h3>
              <p className="text-green-200">Prediction Accuracy</p>
            </div>

            <div>
              <h3 className="text-3xl font-bold">24/7</h3>
              <p className="text-green-200">AI Monitoring</p>
            </div>

          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >

          <h2 className="text-3xl font-bold mb-4">
            Join the Future of Farming 🌾
          </h2>

          <p className="text-slate-600 mb-6">
            Start using AI to improve your farm productivity today.
          </p>

          <button
            onClick={() => navigate("/register")}
            className="bg-green-600 hover:bg-green-800 text-white px-8 py-3 rounded-xl shadow-md transition"
          >
            Get Started
          </button>

        </motion.div>

      </div>
    </>
  );
}