import React from "react";
import {
  Cpu,
  Leaf,
  Droplets,
  BarChart3,
  BellRing,
  BrainCircuit
} from "lucide-react";

const Home = () => {
  return (
    <div className="space-y-24 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto">

      {/* HERO SECTION */}
      <section className="grid md:grid-cols-2 gap-10 items-center text-center md:text-left">

        {/* Left */}
        <div>
          <p className="text-green-600 font-medium mb-3">
            AI Powered Smart Farming
          </p>

          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
            The Future of Agriculture <br />
            <span className="text-green-700">
              Driven by Artificial Intelligence
            </span>
          </h1>

          <p className="text-slate-600 text-lg mb-8">
            Monitor crops, optimize irrigation, and predict yields using intelligent AI insights.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">

            <button className="px-6 py-3 bg-green-700 text-white rounded-lg shadow-lg shadow-green-700/30 hover:bg-green-800 transition-all duration-300">
              Start Smart Farming
            </button>

            <button className="px-6 py-3 border border-slate-300 rounded-lg hover:bg-slate-100 transition-all duration-300">
              Explore AI Insights
            </button>

          </div>
        </div>

        {/* Right Mock Panel */}
        <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-200">

          <h3 className="text-lg font-semibold mb-4">
            AI Farm Overview
          </h3>

          <div className="space-y-4">

            <div className="p-4 rounded-lg bg-green-50 border border-green-100 flex justify-between text-sm">
              <span>Crop Health</span>
              <span className="text-green-600 font-medium">Excellent</span>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex justify-between text-sm">
              <span>Soil Moisture</span>
              <span className="font-medium">68%</span>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex justify-between text-sm">
              <span>AI Yield Prediction</span>
              <span className="text-green-700 font-medium">+18%</span>
            </div>

          </div>

        </div>

      </section>


      {/* TRUST STRIP */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">

        <div className="flex flex-wrap justify-center gap-6 md:gap-10 text-sm text-slate-600 text-center">

          <span>✔ AI Driven Precision Farming</span>
          <span>✔ Real-Time Monitoring System</span>
          <span>✔ Smart Predictive Analytics</span>
          <span>✔ Water Optimization Intelligence</span>

        </div>

      </section>


      {/* FEATURES */}
      <section>

        <h2 className="text-3xl font-bold text-center mb-12">
          Powerful Smart Agriculture Features
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">

          {[
            {
              icon: Leaf,
              title: "Crop Monitoring",
              desc: "Track crop health with AI-powered analysis."
            },
            {
              icon: Droplets,
              title: "Smart Irrigation",
              desc: "Optimize water usage intelligently."
            },
            {
              icon: Cpu,
              title: "Soil Intelligence",
              desc: "Monitor moisture & nutrient data."
            },
            {
              icon: BarChart3,
              title: "Yield Prediction",
              desc: "Predict production using AI models."
            },
            {
              icon: BellRing,
              title: "Smart Alerts",
              desc: "Instant notifications for farm issues."
            },
            {
              icon: BrainCircuit,
              title: "AI Insights",
              desc: "Actionable farming recommendations."
            }
          ].map((feature, index) => (

            <div
              key={index}
              className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-xl hover:-translate-y-2 transition-all duration-300"
            >

              <feature.icon
                className="text-green-600 mb-4"
                size={26}
              />

              <h3 className="font-semibold mb-2">
                {feature.title}
              </h3>

              <p className="text-sm text-slate-600">
                {feature.desc}
              </p>

            </div>

          ))}

        </div>

      </section>


      {/* AI SECTION */}
      <section className="grid md:grid-cols-2 gap-10 items-center text-center md:text-left">

        <div>

          <h2 className="text-3xl font-bold mb-6">
            Artificial Intelligence at the Core
          </h2>

          <p className="text-slate-600 mb-6">
            Our AI engine analyzes farm data to deliver predictive insights,
            detect anomalies, and enhance agricultural decision-making.
          </p>

          <div className="space-y-4 text-sm">

            <p>✔ Crop Disease Detection</p>
            <p>✔ Predictive Yield Models</p>
            <p>✔ Water Optimization Algorithms</p>
            <p>✔ Smart Farming Assistant</p>

          </div>

        </div>

        <div className="bg-linear-to-br from-green-100 to-green-50 p-6 rounded-2xl shadow-inner">

          <h3 className="font-semibold mb-4">
            AI Prediction Engine
          </h3>

          <p className="text-sm text-slate-600">
            AI continuously evaluates environmental and crop parameters
            to optimize outcomes.
          </p>

        </div>

      </section>


      {/* DASHBOARD PREVIEW */}
      <section>

        <h2 className="text-3xl font-bold text-center mb-12">
          Intelligent Farm Dashboard
        </h2>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">

            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">
                Soil Moisture
              </p>
              <p className="text-xl font-semibold">
                68%
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">
                Temperature
              </p>
              <p className="text-xl font-semibold">
                24°C
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">
                Crop Health
              </p>
              <p className="text-xl font-semibold text-green-600">
                Excellent
              </p>
            </div>

          </div>

        </div>

      </section>


      {/* BENEFITS */}
      <section>

        <h2 className="text-3xl font-bold text-center mb-12">
          Why Farmers Choose SmartAgri
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-center">

          {[
            "Increase Yield",
            "Save Water",
            "Reduce Costs",
            "Data-Driven Decisions"
          ].map((benefit, index) => (

            <div
              key={index}
              className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-lg transition-all"
            >

              <p className="font-semibold">
                {benefit}
              </p>

            </div>

          ))}

        </div>

      </section>


      {/* CTA */}
      <section className="bg-[#14532D] text-white rounded-2xl p-6 md:p-10 text-center shadow-xl">

        <h2 className="text-3xl font-bold mb-4">
         🌿 Start Smart Farming Today 🌿
        </h2>

        <p className="text-green-200 mb-6">
          Transform your agricultural practices with AI-powered intelligence.
        </p>

        <button className="px-6 py-3 bg-[#22C55E] rounded-lg hover:bg-green-600 transition shadow-md shadow-green-500/30">
          Register Now
        </button>

      </section>

    </div>
  );
};

export default Home;