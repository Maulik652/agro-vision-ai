import React from "react";
import { motion } from "framer-motion";
import { BookOpen, Lightbulb } from "lucide-react";
import PublicAdvisoryFeed from "../../components/publicAdvisory/PublicAdvisoryFeed.jsx";

const Advisory = () => (
  <div className="min-h-screen bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef]">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center">
            <BookOpen size={22} className="text-emerald-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Expert Advisories</h1>
            <p className="text-sm text-slate-500 mt-0.5">Guidance published by certified agricultural experts</p>
          </div>
        </div>

        {/* Info pill */}
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-700">
          <Lightbulb size={14} className="shrink-0" />
          <span>Advisories are tailored to your crop type and region</span>
        </div>
      </motion.div>

      {/* Feed */}
      <PublicAdvisoryFeed role="farmer" />
    </div>
  </div>
);

export default Advisory;
