/**
 * Payment Page — AgroVision AI
 * Route: /buyer/payment?parentOrderId=PAY-xxx
 *
 * Responsibilities:
 *  1. Fetch order summary for the given parentOrderId
 *  2. Display items grouped by farmer, delivery address, price breakdown
 *  3. Allow payment method selection
 *  4. Execute payment flow: create gateway order → open modal → verify
 *  5. Show success / failure state with retry
 *
 * Backend already has all payment APIs from the checkout module.
 * This page is purely the payment execution UI.
 */
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

import {
  fetchPaymentSummary,
  createPaymentOrder,
  verifyPayment,
  loadRazorpayScript,
  openRazorpay,
} from "../../services/paymentAPI.js";
import usePaymentStore from "../../store/paymentStore.js";
import useCartStore from "../../store/cartStore.js";

import PaymentSkeleton       from "../../components/payment/PaymentSkeleton.jsx";
import PaymentSummary        from "../../components/payment/PaymentSummary.jsx";
import DeliveryInfo          from "../../components/payment/DeliveryInfo.jsx";
import PaymentMethodSelector from "../../components/payment/PaymentMethodSelector.jsx";
import PaymentBreakdown      from "../../components/payment/PaymentBreakdown.jsx";
import PayButton             from "../../components/payment/PayButton.jsx";
import { PaymentSuccess, PaymentFailed } from "../../components/payment/PaymentStatus.jsx";

export default function Payment() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const qc             = useQueryClient();

  // parentOrderId comes from checkout redirect: /buyer/payment?parentOrderId=PAY-xxx
  const parentOrderId = searchParams.get("parentOrderId");

  const { method, status, errorMessage, setStatus, setError, setSuccess, reset } = usePaymentStore();
  const { clearStore } = useCartStore();

  /* ── Fetch order summary ──────────────────────────────────── */
  const { data, isLoading, isError } = useQuery({
    queryKey: ["payment-summary", parentOrderId],
    queryFn:  () => fetchPaymentSummary(parentOrderId),
    enabled:  !!parentOrderId,
    staleTime: 120_000,
    retry: 1,
  });

  const { orders = [], totals, deliveryAddress, deliveryType, estimatedDelivery } = data ?? {};
  const grandTotal = totals?.grandTotal ?? 0;
  const isProcessing = status === "processing";

  /* ── Payment handler ──────────────────────────────────────── */
  const handlePay = async () => {
    if (!parentOrderId) return;
    setStatus("processing");

    try {
      // Wallet — no gateway needed
      if (method === "wallet") {
        await verifyPayment({ parentOrderId, wallet: true });
        afterSuccess("wallet-pay");
        return;
      }

      // Step 1 — Create gateway order
      const gatewayData = await createPaymentOrder({
        parentOrderId,
        gateway: method,
        grandTotal,
      });

      // Step 2 — Open gateway
      if (method === "razorpay") {
        const loaded = await loadRazorpayScript();
        if (!loaded) throw new Error("Failed to load Razorpay. Check your connection.");

        const rzRes = await openRazorpay({
          gatewayOrderId: gatewayData.gatewayOrderId,
          amount: grandTotal,
          currency: "INR",
        });

        // Step 3 — Verify
        const result = await verifyPayment({
          parentOrderId,
          razorpay_order_id:   rzRes.razorpay_order_id,
          razorpay_payment_id: rzRes.razorpay_payment_id,
          razorpay_signature:  rzRes.razorpay_signature,
        });

        afterSuccess(result.paymentId);

      } else if (method === "stripe") {
        // Stripe Elements — redirect to dedicated stripe confirm page
        navigate(`/buyer/payment/stripe?parentOrderId=${parentOrderId}&clientSecret=${gatewayData.clientSecret}&amount=${grandTotal}`);
      }

    } catch (err) {
      if (err.message === "Payment cancelled") {
        setStatus("idle");
        toast("Payment cancelled", { icon: "ℹ️" });
      } else if (err?.response?.status === 503 || err?.response?.data?.message?.includes("not configured")) {
        setStatus("idle");
        toast.error("Razorpay is not configured. Please use Wallet payment or contact support.");
      } else {
        const msg = err?.response?.data?.message ?? err.message ?? "Payment failed";
        setError(msg);
        toast.error(msg);
      }
    }
  };

  const afterSuccess = (paymentId) => {
    setSuccess(paymentId);
    // Invalidate cart + orders cache
    clearStore();
    qc.setQueryData(["cart"], null);
    qc.invalidateQueries({ queryKey: ["cart"] });
    qc.invalidateQueries({ queryKey: ["payment-summary", parentOrderId] });
  };

  const handleRetry = () => {
    reset();
  };

  /* ── Guard: no parentOrderId ──────────────────────────────── */
  if (!parentOrderId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-slate-500">No order found. Please go through checkout first.</p>
          <button
            onClick={() => navigate("/buyer/cart")}
            className="px-5 py-2.5 rounded-xl bg-green-700 text-white text-sm hover:bg-green-800 transition-all"
          >
            Back to Cart
          </button>
        </div>
      </div>
    );
  }

  /* ── Loading ──────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef]">
        <PageHeader onBack={() => navigate("/buyer/checkout")} />
        <PaymentSkeleton />
      </div>
    );
  }

  /* ── Error loading order ──────────────────────────────────── */
  if (isError || !orders.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-slate-500">Could not load order details.</p>
          <button
            onClick={() => navigate("/buyer/orders")}
            className="px-5 py-2.5 rounded-xl bg-green-700 text-white text-sm hover:bg-green-800 transition-all"
          >
            View My Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef]">
      <PageHeader onBack={() => navigate("/buyer/checkout")} grandTotal={grandTotal} />

      <AnimatePresence mode="wait">
        {/* ── Success screen ── */}
        {status === "success" && (
          <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PaymentSuccess paymentId={usePaymentStore.getState().paymentId} grandTotal={grandTotal} />
          </motion.div>
        )}

        {/* ── Failed screen ── */}
        {status === "failed" && (
          <motion.div key="failed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PaymentFailed message={errorMessage} onRetry={handleRetry} />
          </motion.div>
        )}

        {/* ── Main payment UI ── */}
        {(status === "idle" || status === "processing") && (
          <motion.div
            key="payment-ui"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-5xl mx-auto px-6 py-8"
          >
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

              {/* LEFT — order details */}
              <div className="lg:col-span-3 space-y-5">
                <PaymentSummary orders={orders} />
                <DeliveryInfo
                  address={deliveryAddress}
                  deliveryType={deliveryType}
                  estimatedDelivery={estimatedDelivery}
                />
              </div>

              {/* RIGHT — sticky payment panel */}
              <div className="lg:col-span-2 space-y-4 lg:sticky lg:top-24 self-start">
                <PaymentBreakdown totals={totals} />
                <PaymentMethodSelector disabled={isProcessing} />
                <PayButton
                  onClick={handlePay}
                  loading={isProcessing}
                  disabled={isProcessing}
                  amount={grandTotal}
                  method={method}
                />

                {/* Trust badges */}
                <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      "Escrow payment",
                      "Quality guarantee",
                      "Instant confirmation",
                      "24/7 support",
                    ].map((t) => (
                      <div key={t} className="flex items-center gap-1.5 text-slate-500 text-xs">
                        <ShieldCheck size={11} className="text-green-600 shrink-0" />
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Page header ─────────────────────────────────────────────── */
function PageHeader({ onBack, grandTotal }) {
  return (
    <div className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-slate-400 hover:text-slate-700 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-slate-900 font-bold text-lg">Complete Payment</h1>
            <p className="text-slate-400 text-xs">Secure checkout · AgroVision AI</p>
          </div>
        </div>
        {grandTotal > 0 && (
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 border border-green-100">
            <ShieldCheck size={14} className="text-green-700" />
            <span className="text-green-800 font-bold text-sm">₹{grandTotal?.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Breadcrumb */}
      <div className="max-w-5xl mx-auto px-6 pb-3 flex items-center gap-2 text-xs text-slate-400">
        {["Cart", "Checkout", "Payment", "Confirmation"].map((s, i) => (
          <span key={s} className="flex items-center gap-2">
            {i > 0 && <span className="text-slate-200">›</span>}
            <span className={i === 2 ? "text-green-700 font-semibold" : ""}>{s}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
