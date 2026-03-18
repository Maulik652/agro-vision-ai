import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Plus, BarChart2, History, Radio, X, Sparkles, TrendingUp } from "lucide-react";
import AdvisoryOverview from "../../components/advisory/AdvisoryOverview";
import CreateAdvisoryForm from "../../components/advisory/CreateAdvisoryForm";
import AdvisoryFeed from "../../components/advisory/AdvisoryFeed";
import AdvisoryDetail from "../../components/advisory/AdvisoryDetail";
import AIAssistantPanel from "../../components/advisory/AIAssistantPanel";
import MarketInsights from "../../components/advisory/MarketInsights";
import AdvisoryAnalytics from "../../components/advisory/AdvisoryAnalytics";
import BroadcastPanel from "../../components/advisory/BroadcastPanel";
import AdvisoryHistory from "../../components/advisory/AdvisoryHistory";

const TABS = [
  { key: "feed",      label: "Feed",      icon: BookOpen },
  { key: "analytics", label: "Analytics", icon: BarChart2 },
  { key: "history",   label: "History",   icon: History },
  { key: "broadcast", label: "Broadcast", icon: Radio },
];

export default function Advisory() {
  const [tab, setTab]               = useState("feed");
  const [showCreate, setShowCreate] = useState(false);
  const [editData, setEditData]     = useState(null);
  const [viewId, setViewId]         = useState(null);
  const [aiFormData, setAiFormData] = useState(null);
  const [sidebarTab, setSidebarTab] = useState("ai"); // "ai" | "market"

  const handleEdit  = (a) => { setEditData(a); setShowCreate(true); };
  const handleView  = (a) => setViewId(a._id);
  const handleAIFill = (currentForm, applyFn) => setAiFormData({ currentForm, applyFn });
  const handleAIApply = (result) => { aiFormData?.applyFn?.(result); setAiFormData(null); };
  const handleCloseForm = () => { setShowCreate(false); setEditData(null); };

  return (
    <div className="min-h-screen bg-[#f7f8f6]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-8 py-6 space-y-5">

        {/* ── Page header ── */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
              <BookOpen size={17} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Advisory Management</h1>
              <p className="text-xs text-slate-500 hidden sm:block">Publish intelligence, broadcast alerts, and guide farmers with AI</p>
            </div>
          </div>
          <button
            onClick={() => { setEditData(null); setShowCreate(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors shrink-0 shadow-sm"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">New Advisory</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>

        {/* ── Overview stats ── */}
        <AdvisoryOverview />

        {/* ── Create / Edit form ── */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              <CreateAdvisoryForm editData={editData} onClose={handleCloseForm} onAIFill={handleAIFill} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main two-column layout ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5 items-start">

          {/* Left — tabbed content */}
          <div className="min-w-0 space-y-4">
            {/* Tab bar */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm w-fit">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    tab === key
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>

            {/* Tab panels */}
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {tab === "feed"      && <AdvisoryFeed onEdit={handleEdit} onView={handleView} />}
                {tab === "analytics" && <AdvisoryAnalytics />}
                {tab === "history"   && <AdvisoryHistory onView={handleView} />}
                {tab === "broadcast" && <BroadcastPanel />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4 min-w-0">
            {/* Sidebar tab switcher */}
            <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
              <button
                onClick={() => setSidebarTab("ai")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                  sidebarTab === "ai" ? "bg-violet-600 text-white" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <Sparkles size={12} /> AI Assistant
              </button>
              <button
                onClick={() => setSidebarTab("market")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                  sidebarTab === "market" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <TrendingUp size={12} /> Market
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={sidebarTab}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {sidebarTab === "ai"     && <AIAssistantPanel onApply={handleAIApply} />}
                {sidebarTab === "market" && <MarketInsights />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Advisory detail modal */}
      <AdvisoryDetail advisoryId={viewId} open={!!viewId} onClose={() => setViewId(null)} />
    </div>
  );
}
