import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { MessageSquare, Calendar, Brain } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import {
  fetchConsultationOverview,
  fetchConsultations
} from "../../api/consultationApi";

import ConsultationOverview      from "../../components/expertConsultation/ConsultationOverview";
import ConsultationRequestsTable from "../../components/expertConsultation/ConsultationRequestsTable";
import ConsultationDetailsPanel  from "../../components/expertConsultation/ConsultationDetailsPanel";
import AIAnalysisCard             from "../../components/expertConsultation/AIAnalysisCard";
import ScheduleMeetingModal       from "../../components/expertConsultation/ScheduleMeetingModal";
import ExpertRecommendationForm   from "../../components/expertConsultation/ExpertRecommendationForm";
import ConsultationChat           from "../../components/expertConsultation/ConsultationChat";
import ConsultationHistory        from "../../components/expertConsultation/ConsultationHistory";

const STALE = 60_000;

const resolveSocketUrl = () => {
  const url = String(import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL || "").trim();
  return url ? url.replace(/\/api\/?$/, "") : "http://localhost:5000";
};

const greet = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

export default function ConsultationRequests() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const socketRef = useRef(null);

  const [statusFilter, setStatusFilter]       = useState("");
  const [selectedConsultation, setSelected]   = useState(null);
  const [detailOpen, setDetailOpen]           = useState(false);
  const [scheduleOpen, setScheduleOpen]       = useState(false);
  const [chatOpen, setChatOpen]               = useState(false);
  const [activeTab, setActiveTab]             = useState("requests"); // requests | history

  /* ── Queries ── */
  const overviewQ = useQuery({
    queryKey: ["consultation-overview"],
    queryFn: fetchConsultationOverview,
    staleTime: STALE
  });

  const listQ = useQuery({
    queryKey: ["consultations", statusFilter],
    queryFn: () => fetchConsultations({ status: statusFilter || undefined }),
    staleTime: STALE
  });

  /* ── Socket.IO — real-time new request notifications ── */
  useEffect(() => {
    const token = localStorage.getItem("token");
    const socket = io(resolveSocketUrl(), {
      transports: ["websocket"],
      withCredentials: true,
      auth: token ? { token } : undefined
    });
    socketRef.current = socket;

    socket.on("new_consultation_request", (data) => {
      toast.success(`New consultation request: ${data?.cropType || "Crop"}`, { icon: "🌿" });
      qc.invalidateQueries({ queryKey: ["consultations"] });
      qc.invalidateQueries({ queryKey: ["consultation-overview"] });
    });

    socket.on("consultation_accepted",  () => qc.invalidateQueries({ queryKey: ["consultations"] }));
    socket.on("consultation_scheduled", () => qc.invalidateQueries({ queryKey: ["consultations"] }));
    socket.on("consultation_completed", () => {
      qc.invalidateQueries({ queryKey: ["consultations"] });
      qc.invalidateQueries({ queryKey: ["consultation-overview"] });
    });

    return () => socket.disconnect();
  }, [qc]);

  const handleView = (consultation) => {
    setSelected(consultation);
    setDetailOpen(true);
  };

  const handleScheduleOpen = () => {
    setDetailOpen(false);
    setScheduleOpen(true);
  };

  const handleChatOpen = (consultation) => {
    setSelected(consultation);
    setChatOpen(true);
  };

  const consultations = listQ.data?.consultations || [];

  const TABS = [
    { id: "requests", label: "Requests" },
    { id: "history",  label: "History" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef]">
      <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-6">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {greet()}, {user?.name?.split(" ")[0] || "Expert"} 👋
            </h1>
            <p className="text-slate-500 text-sm mt-1">Consultation Management · AgroVision AI</p>
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-600">Live · Socket Connected</span>
          </div>
        </motion.div>

        {/* ── 1. Overview Cards ── */}
        <ConsultationOverview data={overviewQ.data} isLoading={overviewQ.isLoading} />

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit shadow-sm">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === t.id
                  ? "bg-emerald-600 text-white shadow"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === "requests" ? (
          <>
            {/* ── 2. Requests Table ── */}
            <ConsultationRequestsTable
              data={consultations}
              isLoading={listQ.isLoading}
              onView={handleView}
              statusFilter={statusFilter}
              onStatusFilter={setStatusFilter}
            />

            {/* ── Quick action row for active consultations ── */}
            {consultations.filter((c) => ["accepted", "scheduled", "in_progress"].includes(c.status)).length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
                <h3 className="text-slate-800 font-semibold text-sm mb-4">Active Consultations — Quick Actions</h3>
                <div className="space-y-3">
                  {consultations
                    .filter((c) => ["accepted", "scheduled", "in_progress"].includes(c.status))
                    .slice(0, 5)
                    .map((c) => (
                      <div key={c._id}
                        className="flex items-center justify-between gap-4 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-800 font-medium truncate">{c.user?.name || "—"}</p>
                          <p className="text-xs text-slate-400 truncate">{c.cropType} · {c.problemCategory}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {c.status === "accepted" && (
                            <button onClick={() => { setSelected(c); setScheduleOpen(true); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs transition">
                              <Calendar size={12} /> Schedule
                            </button>
                          )}
                          <button onClick={() => handleChatOpen(c)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs transition">
                            <MessageSquare size={12} /> Chat
                          </button>
                          <button onClick={() => handleView(c)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 text-xs transition">
                            <Brain size={12} /> Details
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </motion.div>
            )}

            {/* ── AI Analysis + Recommendation for selected ── */}
            {selectedConsultation && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AIAnalysisCard
                  consultation={selectedConsultation}
                  onAnalysisDone={(analysis) => setSelected((prev) => ({ ...prev, aiAnalysis: analysis }))}
                />
                <ExpertRecommendationForm consultationId={selectedConsultation._id} />
              </div>
            )}
          </>
        ) : (
          /* ── 8. History Tab ── */
          <ConsultationHistory />
        )}
      </div>

      {/* ── Slide-over Detail Panel ── */}
      <ConsultationDetailsPanel
        consultation={selectedConsultation}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onSchedule={handleScheduleOpen}
      />

      {/* ── Schedule Modal ── */}
      {selectedConsultation && (
        <ScheduleMeetingModal
          consultation={selectedConsultation}
          open={scheduleOpen}
          onClose={() => setScheduleOpen(false)}
        />
      )}

      {/* ── Chat Modal ── */}
      {selectedConsultation && (
        <ConsultationChat
          consultationId={selectedConsultation._id}
          open={chatOpen}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
}
