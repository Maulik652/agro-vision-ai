import { motion, AnimatePresence } from "framer-motion";
import { X, User, MapPin, Leaf, Tag, CreditCard, Calendar, ExternalLink, CheckCircle2, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { completeConsultation } from "../../api/consultationApi";
import toast from "react-hot-toast";

const STATUS_STYLE = {
  pending:     "bg-yellow-100 text-yellow-700 border-yellow-200",
  accepted:    "bg-blue-100 text-blue-700 border-blue-200",
  scheduled:   "bg-purple-100 text-purple-700 border-purple-200",
  in_progress: "bg-cyan-100 text-cyan-700 border-cyan-200",
  completed:   "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected:    "bg-red-100 text-red-700 border-red-200"
};

const CATEGORY_EMOJI = {
  disease: "🦠", pest: "🐛", nutrition: "🌿", irrigation: "💧",
  market: "📈", weather: "🌦️", general: "💬"
};

function InfoRow({ icon: Icon, label, value, className = "" }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100 shrink-0">
        <Icon size={13} className="text-slate-400" />
      </div>
      <div>
        <p className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</p>
        <p className={`text-sm text-slate-800 mt-0.5 ${className}`}>{value}</p>
      </div>
    </div>
  );
}

export default function ConsultationDetailsPanel({ consultation, open, onClose, onSchedule }) {
  const qc = useQueryClient();

  const completeMut = useMutation({
    mutationFn: () => completeConsultation(consultation._id),
    onSuccess: () => {
      toast.success("Consultation marked as completed");
      qc.invalidateQueries({ queryKey: ["consultations"] });
      qc.invalidateQueries({ queryKey: ["consultation-overview"] });
      onClose();
    },
    onError: (e) => toast.error(e?.response?.data?.message || "Failed to complete")
  });

  const c = consultation;
  const canSchedule = c?.status === "accepted";
  const canComplete = ["scheduled", "in_progress"].includes(c?.status);

  return (
    <AnimatePresence>
      {open && c && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-end bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="h-full w-full max-w-xl bg-white border-l border-slate-200 shadow-2xl overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-mono">#{String(c._id).slice(-8).toUpperCase()}</p>
                <h2 className="text-slate-900 font-semibold mt-0.5">{c.cropType} Consultation</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] px-2.5 py-1 rounded-full border capitalize ${STATUS_STYLE[c.status] || ""}`}>
                  {c.status?.replace("_", " ")}
                </span>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* User Info */}
              <section>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Farmer / User Info</p>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-sm shrink-0">
                      {c.user?.name?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <p className="text-slate-800 font-medium text-sm">{c.user?.name || "Unknown"}</p>
                      <p className="text-slate-400 text-xs">{c.user?.email}</p>
                    </div>
                  </div>
                  <InfoRow icon={User}   label="Phone"    value={c.user?.phone} />
                  <InfoRow icon={MapPin} label="Location" value={[c.user?.city, c.user?.state].filter(Boolean).join(", ")} />
                </div>
              </section>

              {/* Crop & Problem */}
              <section>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Crop & Problem Details</p>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                  <InfoRow icon={Leaf} label="Crop Type" value={c.cropType} />
                  <InfoRow icon={Tag}  label="Category"  value={`${CATEGORY_EMOJI[c.problemCategory] || "💬"} ${c.problemCategory}`} className="capitalize" />
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">Problem Description</p>
                    <p className="text-sm text-slate-700 leading-relaxed bg-white border border-slate-100 rounded-xl p-3">{c.description}</p>
                  </div>
                </div>
              </section>

              {/* Uploaded Images */}
              {c.images?.length > 0 && (
                <section>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Uploaded Images</p>
                  <div className="grid grid-cols-3 gap-2">
                    {c.images.map((img, i) => (
                      <a key={i} href={img} target="_blank" rel="noopener noreferrer" className="group relative">
                        <img
                          src={img} alt={`crop-${i}`} loading="lazy"
                          className="w-full h-24 object-cover rounded-xl border border-slate-200 group-hover:border-emerald-400 transition"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition">
                          <ExternalLink size={16} className="text-white" />
                        </div>
                      </a>
                    ))}
                  </div>
                </section>
              )}

              {/* Payment */}
              <section>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Payment</p>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard size={15} className="text-slate-400" />
                    <span className="text-sm text-slate-700">Consultation Fee</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-900 font-semibold">
                      {c.consultationFee > 0 ? `₹${c.consultationFee}` : "Free"}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${
                      c.paymentStatus === "paid"    ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                      c.paymentStatus === "failed"  ? "bg-red-100 text-red-700 border-red-200" :
                      "bg-yellow-100 text-yellow-700 border-yellow-200"
                    }`}>{c.paymentStatus}</span>
                  </div>
                </div>
              </section>

              {/* Scheduled Meeting */}
              {c.scheduledMeeting && (
                <section>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Scheduled Meeting</p>
                  <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-purple-600" />
                      <span className="text-sm text-slate-800">{c.scheduledMeeting.date} at {c.scheduledMeeting.time}</span>
                    </div>
                    <p className="text-xs text-slate-500 capitalize">Type: {c.scheduledMeeting.meetingType}</p>
                    {c.scheduledMeeting.meetingLink && (
                      <a href={c.scheduledMeeting.meetingLink} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 transition">
                        <ExternalLink size={12} /> Join Meeting
                      </a>
                    )}
                    {c.scheduledMeeting.notes && (
                      <p className="text-xs text-slate-400 mt-1">{c.scheduledMeeting.notes}</p>
                    )}
                  </div>
                </section>
              )}

              {/* AI Analysis preview */}
              {c.aiAnalysis?.disease && (
                <section>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">AI Analysis Result</p>
                  <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 space-y-2">
                    <p className="text-sm text-slate-800 font-medium">{c.aiAnalysis.disease}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${c.aiAnalysis.confidence}%` }} />
                      </div>
                      <span className="text-xs text-slate-500">{c.aiAnalysis.confidence}%</span>
                    </div>
                    {c.aiAnalysis.treatment && (
                      <p className="text-xs text-slate-600">{c.aiAnalysis.treatment}</p>
                    )}
                  </div>
                </section>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-2">
                {canSchedule && (
                  <button onClick={onSchedule}
                    className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm transition flex items-center justify-center gap-2">
                    <Calendar size={15} /> Schedule Meeting
                  </button>
                )}
                {canComplete && (
                  <button onClick={() => completeMut.mutate()} disabled={completeMut.isPending}
                    className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-medium text-sm transition flex items-center justify-center gap-2">
                    {completeMut.isPending ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                    {completeMut.isPending ? "Completing..." : "Mark as Completed"}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
