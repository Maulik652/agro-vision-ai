import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, Clock, CheckCircle, Loader2, AlertCircle, X } from "lucide-react";
import { fetchPendingPayments, payForConsultation } from "../../api/consultationApi.js";

const PayModal = ({ consultation, onClose, onPaid }) => {
  const [paymentId, setPaymentId] = useState("");
  const [gateway, setGateway]     = useState("razorpay");
  const qc = useQueryClient();

  const pay = useMutation({
    mutationFn: () => payForConsultation(consultation._id, { paymentId: paymentId || undefined, paymentGateway: gateway }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending-payments"] });
      qc.invalidateQueries({ queryKey: ["my-consultations"] });
      onPaid();
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-800">Pay Consultation Fee</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"><X size={16} /></button>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 space-y-1">
          <p className="text-xs text-slate-500">Expert</p>
          <p className="text-sm font-semibold text-slate-800">{consultation.expert?.name}</p>
          <p className="text-xs text-slate-500 mt-2">Crop / Issue</p>
          <p className="text-sm text-slate-700">{consultation.cropType} — {consultation.problemCategory}</p>
          <p className="text-xs text-slate-500 mt-2">Amount Due</p>
          <p className="text-xl font-bold text-emerald-700">₹{consultation.consultationFee?.toLocaleString()}</p>
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label className="text-[11px] text-slate-500 uppercase tracking-wide block mb-1">Payment Gateway</label>
            <select value={gateway} onChange={e => setGateway(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400">
              <option value="razorpay">Razorpay</option>
              <option value="stripe">Stripe</option>
              <option value="wallet">Wallet</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] text-slate-500 uppercase tracking-wide block mb-1">Payment ID (optional)</label>
            <input value={paymentId} onChange={e => setPaymentId(e.target.value)} placeholder="e.g. pay_XXXXXXXX"
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
        </div>

        {pay.isError && (
          <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
            <AlertCircle size={12} /> {pay.error?.message || "Payment failed"}
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={() => pay.mutate()} disabled={pay.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
            {pay.isPending ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
            Pay ₹{consultation.consultationFee?.toLocaleString()}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const PendingPayments = () => {
  const [selected, setSelected] = useState(null);
  const [paidId, setPaidId]     = useState(null);

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ["pending-payments"],
    queryFn:  fetchPendingPayments,
    staleTime: 60_000,
  });

  if (isLoading) return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 space-y-3">
      {[1,2].map(i => <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse" />)}
    </div>
  );

  if (pending.length === 0) return null;

  return (
    <>
      <div className="bg-white border border-amber-200 shadow-sm rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
            <Clock size={15} className="text-amber-700" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Pending Consultation Payments</h3>
            <p className="text-[11px] text-amber-600">{pending.length} payment{pending.length > 1 ? "s" : ""} due</p>
          </div>
        </div>

        <div className="space-y-3">
          {pending.map(c => (
            <motion.div key={c._id} layout
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                paidId === c._id ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
              }`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{c.expert?.name || "Expert"}</p>
                <p className="text-xs text-slate-500">{c.cropType} — {c.problemCategory}</p>
              </div>
              <p className="text-sm font-bold text-emerald-700 shrink-0">₹{c.consultationFee?.toLocaleString()}</p>
              {paidId === c._id ? (
                <span className="flex items-center gap-1 text-xs text-emerald-700 font-semibold shrink-0">
                  <CheckCircle size={13} /> Paid
                </span>
              ) : (
                <button onClick={() => setSelected(c)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shrink-0">
                  <CreditCard size={12} /> Pay Now
                </button>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <PayModal
            consultation={selected}
            onClose={() => setSelected(null)}
            onPaid={() => setPaidId(selected._id)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default PendingPayments;
