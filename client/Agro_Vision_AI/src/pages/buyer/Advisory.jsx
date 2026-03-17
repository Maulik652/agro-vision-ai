import React from "react";
import { motion } from "framer-motion";
import { BookOpen, TrendingUp } from "lucide-react";
import PublicAdvisoryFeed from "../../components/publicAdvisory/PublicAdvisoryFeed.jsx";

const BuyerAdvisory = () => (
  <div className="min-h-screen bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef]">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center">
            <BookOpen size={22} className="text-blue-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Market Advisories</h1>
            <p className="text-sm text-slate-500 mt-0.5">Expert insights on crop prices, demand trends, and market intelligence</p>
          </div>
        </div>

        {/* Info pill */}
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-xs text-blue-700">
          <TrendingUp size={14} className="shrink-0" />
          <span>Advisories relevant to your buying activity and region</span>
        </div>
      </motion.div>

      {/* Feed */}
      <PublicAdvisoryFeed role="buyer" />
    </div>
  </div>
);

export default BuyerAdvisory;
