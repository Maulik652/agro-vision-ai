/**
 * AddMoneyModal — modal for selecting amount and gateway, then triggering payment.
 * Flow: enter amount → pick gateway → pay → verify → wallet credited.
 */
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import { addMoney, verifyTopup } from "../../services/walletAPI.js";
import { loadRazorpayScript, openRazorpay } from "../../services/paymentAPI.js";
import useWalletStore from "../../store/walletStore.js";

const QUICK_AMOUNTS = [100, 250, 500, 1000, 2000, 5000];

export default function AddMoneyModal() {
  const qc = useQueryClient();
  const {
    showAddMoney, closeAddMoney,
    addAmount, setAddAmount,
    gateway, setGateway,
    topupStatus, setStatus,
    errorMsg,
  } = useWalletStore();

  const amount = parseFloat(addAmount);
  const valid  = !isNaN(amount) && amount >= 10 && amount <= 100000;

  const handlePay = async () => {
    if (!valid) return;
    setStatus("processing");

    try {
      // Step 1 — create gateway order
      const orderData = await addMoney({ amount, gateway });

      if (gateway === "razorpay") {
        const loaded = await loadRazorpayScript();
        if (!loaded) throw new Error("Razorpay SDK failed to load");

        const response = await openRazorpay({
          gatewayOrderId: orderData.gatewayOrderId,
          amount,
          description: "AgroVision Wallet Top-up",
        });

        // Step 2 — verify and credit
        await verifyTopup({
          gateway: "razorpay",
          referenceId:          orderData.referenceId,
          razorpay_order_id:    response.razorpay_order_id,
          razorpay_payment_id:  response.razorpay_payment_id,
          razorpay_signature:   response.razorpay_signature,
        });

      } else {
        // Stripe — in production open Stripe Elements; here we show the client secret
        // and assume the payment completes via Stripe's hosted UI
        toast("Stripe payment flow — integrate Stripe Elements for production", { icon: "ℹ️" });
        setStatus("idle");
        return;
      }

      setStatus("success");
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["wallet-transactions"] });
      toast.success(`₹${amount} added to your wallet`);
      setTimeout(closeAddMoney, 1800);

    } catch (e) {
      const msg = e?.response?.data?.message ?? e.message ?? "Payment failed";
      setStatus("failed", msg);
      toast.error(msg);
    }
  };

  return (
    <AnimatePresence>
      {showAddMoney && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeAddMoney}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-slate-800 font-bold text-lg">Add Money to Wallet</h2>
              <button onClick={closeAddMoney} className="text-slate-400 hover:text-slate-700 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Success state */}
            {topupStatus === "success" ? (
              <div className="flex flex-col items-center py-8 gap-3">
                <CheckCircle2 size={48} className="text-green-500" />
                <p className="text-slate-700 font-semibold">₹{amount} added successfully</p>
              </div>
            ) : (
              <>
                {/* Quick amounts */}
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">Quick Select</p>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {QUICK_AMOUNTS.map((v) => (
                    <button
                      key={v}
                      onClick={() => setAddAmount(String(v))}
                      className={`py-2 rounded-xl text-sm font-semibold border transition-all
                        ${addAmount === String(v)
                          ? "bg-green-700 text-white border-green-700"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:border-green-400"
                        }`}
                    >
                      ₹{v}
                    </button>
                  ))}
                </div>

                {/* Custom amount */}
                <div className="mb-4">
                  <label className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1.5 block">
                    Or enter amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">₹</span>
                    <input
                      type="number"
                      min={10}
                      max={100000}
                      value={addAmount}
                      onChange={(e) => setAddAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent"
                    />
                  </div>
                  {addAmount && !valid && (
                    <p className="text-red-500 text-xs mt-1">Amount must be between ₹10 and ₹1,00,000</p>
                  )}
                </div>

                {/* Gateway selector */}
                <div className="mb-5">
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">Payment Method</p>
                  <div className="flex gap-3">
                    {["razorpay", "stripe"].map((g) => (
                      <button
                        key={g}
                        onClick={() => setGateway(g)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all capitalize
                          ${gateway === g
                            ? "bg-green-700 text-white border-green-700"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:border-green-400"
                          }`}
                      >
                        {g === "razorpay" ? "Razorpay" : "Stripe"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error */}
                {topupStatus === "failed" && errorMsg && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 mb-4">
                    <AlertCircle size={14} className="text-red-500 shrink-0" />
                    <p className="text-red-600 text-xs">{errorMsg}</p>
                  </div>
                )}

                {/* Pay button */}
                <button
                  onClick={handlePay}
                  disabled={!valid || topupStatus === "processing"}
                  className="w-full py-3 rounded-xl bg-green-700 text-white font-bold text-sm hover:bg-green-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {topupStatus === "processing"
                    ? <><Loader2 size={16} className="animate-spin" /> Processing...</>
                    : `Pay ₹${valid ? amount : "—"}`
                  }
                </button>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
