/**
 * Checkout Page — AgroVision AI
 * Multi-farmer order splitting, address management,
 * delivery options, Razorpay/Stripe payment integration.
 *
 * Flow:
 *  1. Load checkout summary (grouped by farmer)
 *  2. Buyer selects address + delivery type + payment method
 *  3. POST /api/orders/create → get parentOrderId + grandTotal
 *  4. POST /api/payments/create-order → get gatewayOrderId
 *  5. Open payment gateway modal
 *  6. POST /api/payments/verify → confirm payment
 *  7. Show success screen, clear cart store
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Package } from "lucide-react";
import toast from "react-hot-toast";

import { fetchCheckoutSummary, createOrder } from "../../services/checkoutAPI.js";
import useCheckoutStore from "../../store/checkoutStore.js";
import useCartStore from "../../store/cartStore.js";

import CheckoutSkeleton  from "../../components/checkout/CheckoutSkeleton.jsx";
import OrderSummary      from "../../components/checkout/OrderSummary.jsx";
import AddressSelector   from "../../components/checkout/AddressSelector.jsx";
import DeliveryOptions   from "../../components/checkout/DeliveryOptions.jsx";
import PaymentMethod     from "../../components/checkout/PaymentMethod.jsx";
import PriceBreakdown    from "../../components/checkout/PriceBreakdown.jsx";
import CheckoutButton    from "../../components/checkout/CheckoutButton.jsx";

export default function Checkout() {
  const navigate    = useNavigate();
  const qc          = useQueryClient();
  const [placing, setPlacing] = useState(false);

  const {
    deliveryType, paymentMethod, selectedAddressId,
    setOrderResult, reset,
  } = useCheckoutStore();
  const { clearStore } = useCartStore();

  /* ── Fetch checkout summary (re-fetches when deliveryType changes) ── */
  const { data, isLoading, isError } = useQuery({
    queryKey: ["checkout-summary", deliveryType],
    queryFn:  () => fetchCheckoutSummary(deliveryType),
    staleTime: 0,
  });

  const summary = data?.summary;
  const groups  = data?.groups ?? [];

  /* ── Place Order Flow ─────────────────────────────────────────────── */
  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      toast.error("Please select a delivery address");
      return;
    }
    if (!groups.length) {
      toast.error("Your cart is empty");
      return;
    }

    setPlacing(true);
    try {
      // Step 1 — Create sub-orders in DB
      const orderResult = await createOrder({
        addressId: selectedAddressId,
        deliveryType,
        paymentMethod,
      });
      const { parentOrderId, grandTotal, orders } = orderResult;
      setOrderResult(parentOrderId, grandTotal, orders);

      // Clear cart immediately — order is created
      clearStore();
      qc.setQueryData(["cart"], null);
      qc.invalidateQueries({ queryKey: ["cart"] });

      // Step 2 — Wallet: no gateway, go straight to orders
      if (paymentMethod === "wallet") {
        toast.success("Order placed via wallet!");
        navigate("/buyer/orders?success=1");
        reset();
        return;
      }

      // Step 3 — Redirect to Payment page for gateway handling
      navigate(`/buyer/payment?parentOrderId=${parentOrderId}`);

    } catch (err) {
      toast.error(err?.response?.data?.message ?? err.message ?? "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  /* ── States ───────────────────────────────────────────────────────── */
  if (isLoading) return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef]">
      <CheckoutSkeleton />
    </div>
  );

  if (isError || !groups.length) return (
    <div className="min-h-screen bg-gradient-to-br from-[#f
6f8f4] via-[#eefbf1] to-[#f3f4ef] flex items-center justify-center">
      <div className="text-center space-y-4">
        <Package size={40} className="text-slate-300 mx-auto" />
        <p className="text-slate-500">Your cart is empty</p>
        <button
          onClick={() => navigate("/buyer/marketplace")}
          className="px-5 py-2.5 rounded-xl bg-green-700 text-white text-sm hover:bg-green-800 transition-all"
        >
          Browse Marketplace
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef]">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center gap-3">
          <button
            onClick={() => navigate("/buyer/cart")}
            className="text-slate-400 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-slate-900 font-bold text-lg">Checkout</h1>
            <p className="text-slate-400 text-xs">{summary?.itemCount ?? 0} items · {groups.length} farmer{groups.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-2 text-xs text-slate-400">
          {["Cart", "Checkout", "Payment", "Confirmation"].map((s, i) => (
            <span key={s} className="flex items-center gap-2">
              {i > 0 && <span className="text-slate-200">›</span>}
              <span className={i === 1 ? "text-green-700 font-semibold" : ""}>{s}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT — main content */}
          <div className="lg:col-span-2 space-y-6">
            <OrderSummary groups={groups} />
            <AddressSelector />
            <DeliveryOptions />
            <PaymentMethod />
          </div>

          {/* RIGHT — sticky summary */}
          <div className="space-y-4">
            <PriceBreakdown summary={summary} />
            <CheckoutButton
              onClick={handlePlaceOrder}
              loading={placing}
              disabled={!selectedAddressId || placing}
              grandTotal={summary?.grandTotal}
            />

            {/* Trust badges */}
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Buyer Protection</p>
              <div className="space-y-2">
                {[
                  "Escrow payment — funds released on delivery",
                  "Quality guaranteed or full refund",
                  "Secure SSL encrypted checkout",
                  "24/7 buyer support",
                ].map((t, i) => (
                  <div key={i} className="flex items-center gap-2 text-slate-500 text-xs">
                    <CheckCircle2 size={13} className="text-green-600 shrink-0" />
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
