import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Plus, BarChart2, History, Radio, X } from "lucide-react";
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
  { key: "broadcast", label: "Broadcast", icon: Radio }
];

export default function Advisory() {
  const [tab, setTab]             = useState("feed");
  const [showCreate, setShowCreate] = useState(false);
  const [editData, setEditData]   = useState(null);
  const [viewId, setViewId]       = useState(null);
  const [aiFormData, setAiFormData] = useState(null);

  const handleEdit = (advisory) => {
    setEditData(advisory);
    setShowCreate(true);
  };

  const handleView = (advisory) => setViewId(advisory._id);

  const handleAIFill = (currentForm, applyFn) => {
    setAiFormData({ currentForm, applyFn });
  };

  const handleAIApply = (result) => {
    aiFormData?.applyFn?.(result);
    setAiFormData(null);
  };

  const handleCloseForm = () => {
    setShowCreate(false);
    setEditData(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Page header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                <BookOpen size={20} className="text-emerald-700" />
              </div>
              Advisory Management
            </h1>
            <p className="text-slate-500 text-sm mt-1">Publish intelligence, broadcast alerts, and guide farmers with AI</p>
          </div>
          <button onClick={() => { setEditData(null); setShowCreate(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition shadow-sm">
            <Plus size={15} /> New Advisory
          </button>
        </motion.div>

        {/* Overview cards */}
        <AdvisoryOverview />

        {/* Create / Edit form */}
        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <CreateAdvisoryForm
                editData={editData}
                onClose={handleCloseForm}
                onAIFill={handleAIFill}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left — main content */}
          <div className="lg:col-span-2 space-y-5">
            {/* Tab bar */}
            <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm w-fit">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => setTab(key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition ${
                    tab === key ? "bg-emerald-600 text-white" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  }`}>
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {tab === "feed" && (
                <motion.div key="feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <AdvisoryFeed onEdit={handleEdit} onView={handleView} />
                </motion.div>
              )}
              {tab === "analytics" && (
                <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <AdvisoryAnalytics />
                </motion.div>
              )}
              {tab === "history" && (
                <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <AdvisoryHistory onView={handleView} />
                </motion.div>
              )}
              {tab === "broadcast" && (
                <motion.div key="broadcast" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <BroadcastPanel />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right sidebar */}
          <div className="space-y-5">
            <AIAssistantPanel onApply={handleAIApply} />
            <MarketInsights />
          </div>
        </div>
      </div>

      {/* Advisory detail modal */}
      <AdvisoryDetail
        advisoryId={viewId}
        open={!!viewId}
        onClose={() => setViewId(null)}
      />
    </div>
  );
}
