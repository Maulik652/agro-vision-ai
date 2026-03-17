import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { PanelLeft, PanelRight, X } from "lucide-react";
import ConsultationSidebar from "./ConsultationSidebar";
import ChatWindow from "./ChatWindow";
import CropDetailsPanel from "./CropDetailsPanel";
import AIInsightsPanel from "./AIInsightsPanel";
import ExpertActionsPanel from "./ExpertActionsPanel";
import TimelinePanel from "./TimelinePanel";
import AIAssistantBox from "./AIAssistantBox";
import { fetchActiveDetail } from "../../api/consultationApi";
import { useAuth } from "../../context/AuthContext";

export default function ActiveConsultationLayout() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedId, setSelectedId]     = useState(null);
  const [rightTab, setRightTab]         = useState("details"); // details | ai | actions
  const [showSidebar, setShowSidebar]   = useState(true);
  const [chatSuggestion, setChatSuggestion] = useState("");

  const { data: consultation, isLoading } = useQuery({
    queryKey: ["active-detail", selectedId],
    queryFn: () => fetchActiveDetail(selectedId),
    enabled: !!selectedId,
    staleTime: 30_000
  });

  const handleSelect = useCallback((id) => {
    setSelectedId(id);
    // On mobile, hide sidebar after selection
    if (window.innerWidth < 768) setShowSidebar(false);
  }, []);

  const handleStatusChange = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["active-detail", selectedId] });
    qc.invalidateQueries({ queryKey: ["active-consultations"] });
    qc.invalidateQueries({ queryKey: ["active-timeline", selectedId] });
  }, [qc, selectedId]);

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef] overflow-hidden">

      {/* ── Left Sidebar ── */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="shrink-0 overflow-hidden border-r border-slate-200 bg-white"
            style={{ width: 280 }}
          >
            <ConsultationSidebar selectedId={selectedId} onSelect={handleSelect} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Center Chat ── */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-b border-slate-200 shrink-0">
          <button onClick={() => setShowSidebar(v => !v)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
            <PanelLeft size={16} />
          </button>
          {consultation && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-medium text-slate-800">{consultation.user?.name}</span>
              <span>·</span>
              <span>{consultation.cropType}</span>
              <span>·</span>
              <span className={`px-2 py-0.5 rounded-full font-medium ${
                consultation.status === "in_progress" ? "bg-emerald-100 text-emerald-700" :
                consultation.status === "scheduled"   ? "bg-sky-100 text-sky-700" :
                consultation.status === "completed"   ? "bg-slate-100 text-slate-600" :
                "bg-red-100 text-red-600"
              }`}>{consultation.status.replace("_", " ")}</span>
            </div>
          )}
          <div className="ml-auto flex items-center gap-1">
            {/* Right panel tabs (mobile) */}
            {["details", "ai", "actions"].map((tab) => (
              <button key={tab} onClick={() => setRightTab(tab)}
                className={`hidden lg:block px-3 py-1.5 rounded-lg text-xs font-medium transition capitalize ${
                  rightTab === tab ? "bg-emerald-100 text-emerald-700" : "text-slate-500 hover:bg-slate-100"
                }`}>
                {tab === "ai" ? "AI" : tab}
              </button>
            ))}
          </div>
        </div>

        <ChatWindow
          consultationId={selectedId}
          consultation={consultation}
          userId={user?.id || user?._id}
          initialSuggestion={chatSuggestion}
          onSuggestionUsed={() => setChatSuggestion("")}
        />
      </div>

      {/* ── Right Panel ── */}
      {selectedId && (
        <div className="w-72 shrink-0 border-l border-slate-200 bg-white overflow-y-auto hidden lg:flex flex-col">
          {/* Tab bar */}
          <div className="flex border-b border-slate-100 shrink-0">
            {[
              { key: "details", label: "Details" },
              { key: "ai",      label: "AI" },
              { key: "actions", label: "Actions" }
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setRightTab(key)}
                className={`flex-1 py-3 text-xs font-medium transition ${
                  rightTab === key
                    ? "border-b-2 border-emerald-500 text-emerald-700"
                    : "text-slate-500 hover:text-slate-700"
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {rightTab === "details" && (
              <CropDetailsPanel consultation={consultation} />
            )}

            {rightTab === "ai" && (
              <div className="p-4 space-y-3">
                <AIInsightsPanel consultation={consultation} consultationId={selectedId} />
                <AIAssistantBox
                  consultation={consultation}
                  onUseSuggestion={(s) => setChatSuggestion(s)}
                />
              </div>
            )}

            {rightTab === "actions" && (
              <div className="p-4 space-y-3">
                <ExpertActionsPanel
                  consultation={consultation}
                  consultationId={selectedId}
                  onStatusChange={handleStatusChange}
                />
                <TimelinePanel consultationId={selectedId} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
