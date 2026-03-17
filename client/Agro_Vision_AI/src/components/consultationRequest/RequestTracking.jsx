import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2, Clock, Calendar, MessageSquare,
  Send, Loader2, User, Video, Phone
} from "lucide-react";
import { fetchMyConsultationById, fetchMyConsultationMessages, sendMyConsultationMessage } from "../../api/consultationApi";
import toast from "react-hot-toast";

const STATUS_STEPS = ["pending","accepted","scheduled","in_progress","completed"];
const STATUS_LABELS = {
  pending:     "Request Submitted",
  accepted:    "Expert Accepted",
  scheduled:   "Session Scheduled",
  in_progress: "In Progress",
  completed:   "Completed",
  rejected:    "Rejected",
};
const STATUS_COLORS = {
  pending:     "text-yellow-600",
  accepted:    "text-blue-600",
  scheduled:   "text-cyan-600",
  in_progress: "text-purple-600",
  completed:   "text-green-400",
  rejected:    "text-red-400",
};

const MEETING_ICONS = { video: Video, phone: Phone, chat: MessageSquare };

export default function RequestTracking({ consultationId }) {
  const qc = useQueryClient();
  const [msg, setMsg] = useState("");
  const [showChat, setShowChat] = useState(false);
  const bottomRef = useRef();

  const { data: consultation, isLoading } = useQuery({
    queryKey: ["my-consultation", consultationId],
    queryFn: () => fetchMyConsultationById(consultationId),
    enabled: !!consultationId,
    staleTime: 30_000,
    refetchInterval: 15_000,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["my-consultation-messages", consultationId],
    queryFn: () => fetchMyConsultationMessages(consultationId),
    enabled: !!consultationId && showChat,
    staleTime: 10_000,
    refetchInterval: showChat ? 8_000 : false,
  });

  const sendMutation = useMutation({
    mutationFn: (text) => sendMyConsultationMessage(consultationId, { message: text }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-consultation-messages", consultationId] });
      setMsg("");
    },
    onError: () => toast.error("Failed to send message"),
  });

  useEffect(() => {
    if (showChat) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, showChat]);

  if (!consultationId) return null;
  if (isLoading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 size={24} className="text-green-400 animate-spin" />
    </div>
  );
  if (!consultation) return null;

  const currentStep = STATUS_STEPS.indexOf(consultation.status);
  const MeetingIcon = MEETING_ICONS[consultation.scheduledMeeting?.meetingType] || MessageSquare;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Status tracker */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-slate-900 font-semibold text-lg">Request Status</h2>
          <span className={`text-sm font-semibold ${STATUS_COLORS[consultation.status]}`}>
            {STATUS_LABELS[consultation.status]}
          </span>
        </div>

        {consultation.status !== "rejected" ? (
          <div className="flex items-center gap-0">
            {STATUS_STEPS.map((step, i) => (
              <div key={step} className="flex items-center flex-1 last:flex-none">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                  i <= currentStep
                    ? "bg-green-500 border-green-500"
                    : "bg-white border-slate-200"
                }`}>
                  {i < currentStep
                    ? <CheckCircle2 size={14} className="text-white" />
                    : i === currentStep
                    ? <Clock size={14} className="text-white" />
                    : <div className="w-2 h-2 rounded-full bg-slate-300" />
                  }
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 ${i < currentStep ? "bg-green-500" : "bg-slate-200"}`} />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-600 text-sm">
              Request rejected. {consultation.rejectionReason && `Reason: ${consultation.rejectionReason}`}
            </p>
          </div>
        )}
      </div>

      {/* Expert info */}
      {consultation.expert && (
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center overflow-hidden shrink-0">
            {consultation.expert.avatar
              ? <img src={consultation.expert.avatar} alt={consultation.expert.name} className="w-full h-full object-cover" />
              : <User size={20} className="text-green-400" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-900 font-semibold">{consultation.expert.name}</p>
            <p className="text-slate-500 text-xs">{consultation.expert.specialization || "Agriculture Expert"}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-500 text-xs">Fee</p>
            <p className="text-emerald-600 font-bold">₹{consultation.consultationFee}</p>
          </div>
        </div>
      )}

      {/* Meeting details */}
      {consultation.scheduledMeeting && (
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <MeetingIcon size={16} className="text-cyan-600" />
            <h3 className="text-slate-800 font-medium">Meeting Details</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-slate-400 text-xs">Date</p>
              <p className="text-slate-900">{consultation.scheduledMeeting.date}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Time</p>
              <p className="text-slate-900">{consultation.scheduledMeeting.time}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Type</p>
              <p className="text-slate-900 capitalize">{consultation.scheduledMeeting.meetingType}</p>
            </div>
            {consultation.scheduledMeeting.meetingLink && (
              <div>
                <p className="text-slate-400 text-xs">Link</p>
                <a href={consultation.scheduledMeeting.meetingLink} target="_blank" rel="noreferrer"
                  className="text-emerald-600 underline text-xs truncate block">
                  Join Meeting
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat */}
      {["accepted","scheduled","in_progress","completed"].includes(consultation.status) && (
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowChat(v => !v)}
            className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <MessageSquare size={16} className="text-blue-600" />
              <span className="text-slate-800 font-medium">Chat with Expert</span>
            </div>
            <span className="text-slate-400 text-xs">{showChat ? "Hide" : "Show"}</span>
          </button>

          <AnimatePresence>
            {showChat && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="border-t border-slate-100">
                  {/* Messages */}
                  <div className="h-64 overflow-y-auto p-4 space-y-3">
                    {messages.length === 0 && (
                      <p className="text-slate-400 text-sm text-center py-8">No messages yet. Start the conversation.</p>
                    )}
                    {messages.map((m, i) => {
                      const isMe = m.sender?.role !== "expert";
                      return (
                        <div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                            isMe ? "bg-green-600 text-white" : "bg-slate-100 text-slate-700"
                          }`}>
                            {m.message}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>

                  {/* Input */}
                  <div className="p-4 border-t border-slate-100 flex gap-3">
                    <input
                      type="text"
                      value={msg}
                      onChange={e => setMsg(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && msg.trim() && sendMutation.mutate(msg.trim())}
                      placeholder="Type a message..."
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:border-green-500"
                    />
                    <button
                      onClick={() => msg.trim() && sendMutation.mutate(msg.trim())}
                      disabled={!msg.trim() || sendMutation.isPending}
                      className="w-10 h-10 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-40 flex items-center justify-center transition-colors"
                    >
                      {sendMutation.isPending
                        ? <Loader2 size={15} className="animate-spin text-white" />
                        : <Send size={15} className="text-white" />
                      }
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
