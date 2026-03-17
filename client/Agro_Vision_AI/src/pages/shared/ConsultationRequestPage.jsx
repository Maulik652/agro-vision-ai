/**
 * ConsultationRequestPage — AgroVision AI
 * Accessible to: farmer, buyer
 * Flow: Problem → Images → AI Analysis → Expert → Type → Schedule → Price → Pay → Submit → Track
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Stethoscope, ArrowLeft, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

import {
  fetchAvailableExperts,
  createConsultationRequest,
  runAICropAnalysis,
} from "../../api/consultationApi";
import {
  createPaymentOrder,
  verifyPayment,
  loadRazorpayScript,
  openRazorpay,
} from "../../services/paymentAPI";

import ProblemForm       from "../../components/consultationRequest/ProblemForm";
import ImageUploader     from "../../components/consultationRequest/ImageUploader";
import AIAnalysisPreview from "../../components/consultationRequest/AIAnalysisPreview";
import ExpertSelector    from "../../components/consultationRequest/ExpertSelector";
import ConsultationType  from "../../components/consultationRequest/ConsultationType";
import SchedulePicker    from "../../components/consultationRequest/SchedulePicker";
import PriceSummary, { calcPricing } from "../../components/consultationRequest/PriceSummary";
import PaymentSection    from "../../components/consultationRequest/PaymentSection";
import SubmitRequestButton from "../../components/consultationRequest/SubmitRequestButton";
import RequestTracking   from "../../components/consultationRequest/RequestTracking";
import PendingPayments   from "../../components/consultationRequest/PendingPayments";

/* ─── Initial state ─────────────────────────────────────────────────────── */
const initForm = {
  cropType: "", problemCategory: "", description: "", city: "", state: "",
};
const initSchedule = { date: "", time: "", notes: "" };

export default function ConsultationRequestPage() {
  const [form,           setForm]           = useState(initForm);
  const [images,         setImages]         = useState([]);
  const [aiAnalysis,     setAiAnalysis]     = useState(null);
  const [aiLoading,      setAiLoading]      = useState(false);
  const [aiError,        setAiError]        = useState(null);
  const [autoAssign,     setAutoAssign]     = useState(true);
  const [selectedExpert, setSelectedExpert] = useState(null);
  const [consultType,    setConsultType]    = useState("chat");
  const [schedule,       setSchedule]       = useState(initSchedule);
  const [payMethod,      setPayMethod]      = useState("razorpay");
  const [submitError,    setSubmitError]    = useState(null);
  const [createdId,      setCreatedId]      = useState(null); // after success

  /* ── Experts list ─────────────────────────────────────────────────────── */
  const { data: experts = [] } = useQuery({
    queryKey: ["available-experts"],
    queryFn: fetchAvailableExperts,
    staleTime: 120_000,
  });

  /* ── Consultation fee from selected expert ────────────────────────────── */
  const consultationFee = autoAssign
    ? (experts[0]?.consultationFee ?? 500)
    : (experts.find(e => e._id === selectedExpert)?.consultationFee ?? 500);

  const { total: grandTotal } = calcPricing(consultationFee);

  /* ── AI analysis on image upload ──────────────────────────────────────── */
  useEffect(() => {
    if (images.length === 0) { setAiAnalysis(null); setAiError(null); return; }
    const timer = setTimeout(async () => {
      setAiLoading(true);
      setAiError(null);
      try {
        const result = await runAICropAnalysis({
          cropType: form.cropType || "unknown",
          images: images.map(i => i.preview),
        });
        setAiAnalysis(result);
      } catch {
        setAiError("AI analysis failed. You can still submit your request.");
      } finally {
        setAiLoading(false);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [images.length]);

  /* ── Create consultation mutation ─────────────────────────────────────── */
  const createMutation = useMutation({
    mutationFn: createConsultationRequest,
    onSuccess: (data) => {
      setCreatedId(data._id);
      toast.success("Consultation request submitted!");
    },
    onError: (e) => {
      setSubmitError(e?.response?.data?.message || "Failed to submit request");
    },
  });

  /* ── Validation ───────────────────────────────────────────────────────── */
  const validate = () => {
    if (!form.cropType)        return "Please select a crop type";
    if (!form.problemCategory) return "Please select a problem category";
    if (!form.description || form.description.length < 20)
                               return "Please describe the problem (min 20 chars)";
    if (!autoAssign && !selectedExpert) return "Please select an expert";
    if (!schedule.date)        return "Please pick a date";
    if (!schedule.time)        return "Please pick a time slot";
    return null;
  };

  /* ── Submit handler ───────────────────────────────────────────────────── */
  const handleSubmit = async () => {
    setSubmitError(null);
    const validationError = validate();
    if (validationError) { setSubmitError(validationError); return; }

    try {
      // 1. Payment
      let paymentId = null;
      if (grandTotal > 0) {
        if (payMethod === "wallet") {
          const res = await verifyPayment({ wallet: true, amount: grandTotal, type: "consultation" });
          paymentId = res?.paymentId || "wallet";
        } else if (payMethod === "razorpay") {
          const loaded = await loadRazorpayScript();
          if (!loaded) throw new Error("Failed to load Razorpay");

          const order = await createPaymentOrder({ amount: grandTotal, gateway: "razorpay", type: "consultation" });
          const rzRes = await openRazorpay({
            gatewayOrderId: order.gatewayOrderId,
            amount: grandTotal,
            currency: "INR",
            description: `Consultation - ${form.cropType}`,
          });
          const verified = await verifyPayment({
            razorpay_order_id:   rzRes.razorpay_order_id,
            razorpay_payment_id: rzRes.razorpay_payment_id,
            razorpay_signature:  rzRes.razorpay_signature,
            type: "consultation",
          });
          paymentId = verified?.paymentId;
        }
      }

      // 2. Create consultation
      await createMutation.mutateAsync({
        expertId:        autoAssign ? undefined : selectedExpert,
        cropType:        form.cropType,
        problemCategory: form.problemCategory,
        description:     form.description,
        images:          images.map(i => i.preview),
        aiAnalysis,
        consultationType: consultType,
        schedule:        { date: schedule.date, time: schedule.time, notes: schedule.notes },
        consultationFee,
        paymentStatus:   paymentId ? "paid" : "pending",
        paymentId,
        farmLocation:    { city: form.city, state: form.state },
      });
    } catch (e) {
      if (e.message === "Payment cancelled") {
        toast("Payment cancelled", { icon: "ℹ️" });
      } else {
        setSubmitError(e?.response?.data?.message || e.message || "Submission failed");
      }
    }
  };

  const isSubmitting = createMutation.isPending;

  /* ── Success view ─────────────────────────────────────────────────────── */
  if (createdId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef] px-6 py-10">
        <div className="max-w-3xl mx-auto space-y-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm"
          >
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <h2 className="text-slate-900 font-bold text-2xl mb-2">Request Submitted!</h2>
            <p className="text-slate-500 text-sm">Your consultation request has been sent to the expert. Track the status below.</p>
          </motion.div>

          <RequestTracking consultationId={createdId} />

          <button
            onClick={() => { setCreatedId(null); setForm(initForm); setImages([]); setAiAnalysis(null); setSchedule(initSchedule); }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition text-sm shadow-sm"
          >
            <ArrowLeft size={15} />
            Submit Another Request
          </button>
        </div>
      </div>
    );
  }

  /* ── Main form ────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
            <Stethoscope size={18} className="text-green-700" />
          </div>
          <div>
            <h1 className="text-slate-900 font-bold text-lg">Book Expert Consultation</h1>
            <p className="text-slate-400 text-xs">AI-powered agri consulting · AgroVision AI</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Pending payments banner — shown if user has unpaid consultations */}
        <div className="mb-6">
          <PendingPayments />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT — main form (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            <ProblemForm
              form={form}
              onChange={(key, val) => setForm(p => ({ ...p, [key]: val }))}
            />

            <ImageUploader
              images={images}
              onAdd={(img) => setImages(p => [...p, img])}
              onRemove={(i) => setImages(p => p.filter((_, idx) => idx !== i))}
            />

            <AnimatePresence>
              {(aiLoading || aiAnalysis || aiError) && (
                <AIAnalysisPreview analysis={aiAnalysis} loading={aiLoading} error={aiError} />
              )}
            </AnimatePresence>

            <ExpertSelector
              experts={experts}
              selectedId={selectedExpert}
              onSelect={setSelectedExpert}
              autoAssign={autoAssign}
              onToggleAuto={() => setAutoAssign(v => !v)}
            />

            <ConsultationType selected={consultType} onSelect={setConsultType} />

            <SchedulePicker
              schedule={schedule}
              onChange={(key, val) => setSchedule(p => ({ ...p, [key]: val }))}
            />
          </div>

          {/* RIGHT — sticky summary + payment (4 cols) */}
          <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-24 self-start">
            <PriceSummary consultationFee={consultationFee} />
            <PaymentSection method={payMethod} onSelect={setPayMethod} />
            <SubmitRequestButton
              onClick={handleSubmit}
              loading={isSubmitting}
              disabled={isSubmitting}
              error={submitError}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
