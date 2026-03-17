/**
 * OrderDetails Page — AgroVision AI Buyer Panel
 * Route: /buyer/orders/:orderId
 *
 * Shows full order breakdown: items, timeline, delivery address, price summary.
 */
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft, Package, MapPin, RefreshCw,
  User, Phone, CreditCard,
} from "lucide-react";

import { fetchOrderById } from "../../services/orderAPI.js";
import useOrderStatusSocket from "../../hooks/useOrderStatusSocket.js";

import OrderStatusBadge from "../../components/orders/OrderStatusBadge.jsx";
import OrderTimeline    from "../../components/orders/OrderTimeline.jsx";
import OrderItems       from "../../components/orders/OrderItems.jsx";

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

const formatCurrency = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

/* ── Skeleton ───────────────────────────────────────────────── */
function DetailSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-28 bg-white rounded-2xl border border-slate-100" />
      <div className="h-64 bg-white rounded-2xl border border-slate-100" />
      <div className="h-48 bg-white rounded-2xl border border-slate-100" />
      <div className="h-36 bg-white rounded-2xl border border-slate-100" />
    </div>
  );
}

/* ── Section card wrapper ───────────────────────────────────── */
function Card({ children, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function SectionTitle({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={15} className="text-green-600" />
      <h3 className="text-slate-700 font-semibold text-sm">{title}</h3>
    </div>
  );
}

export default function OrderDetails() {
  const { orderId } = useParams();
  const navigate    = useNavigate();

  // Real-time status update from admin panel
  useOrderStatusSocket({ queryKeys: ["order", "buyer-orders"], showToast: true });

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ["order", orderId],
    queryFn:  () => fetchOrderById(orderId),
    enabled:  !!orderId,
    staleTime: 60_000,
  });

  /* ── Loading ────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef]">
        <DetailHeader onBack={() => navigate("/buyer/orders")} />
        <div className="max-w-3xl mx-auto px-6 py-8">
          <DetailSkeleton />
        </div>
      </div>
    );
  }

  /* ── Error ──────────────────────────────────────────────── */
  if (isError || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef] flex items-center justify-center">
        <div className="text-center">
          <Package size={40} className="text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 mb-4">Order not found</p>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-700 text-white text-sm font-semibold mx-auto mb-3"
          >
            <RefreshCw size={14} /> Retry
          </button>
          <button
            onClick={() => navigate("/buyer/orders")}
            className="text-slate-400 text-sm hover:text-slate-600 transition-colors"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const addr = order.deliveryAddress ?? {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef]">
      <DetailHeader onBack={() => navigate("/buyer/orders")} orderId={order.orderId} />

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">

        {/* ── Order summary card ─────────────────────────── */}
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-slate-400 text-xs mb-1">Order ID</p>
              <p className="text-slate-800 font-bold text-base">{order.orderId}</p>
              <p className="text-slate-400 text-xs mt-1">Placed on {formatDate(order.createdAt)}</p>
              {order.farmer?.name && (
                <p className="text-slate-500 text-xs mt-1">
                  Farmer: <span className="font-medium text-slate-700">{order.farmer.name}</span>
                </p>
              )}
            </div>
            <OrderStatusBadge status={order.orderStatus} size="lg" />
          </div>

          {/* Estimated delivery */}
          {order.estimatedDelivery && (
            <div className="mt-4 pt-4 border-t border-slate-50">
              <p className="text-slate-400 text-xs">Estimated Delivery</p>
              <p className="text-green-700 font-semibold text-sm mt-0.5">
                {formatDate(order.estimatedDelivery)}
              </p>
            </div>
          )}
        </Card>

        {/* ── Order timeline ─────────────────────────────── */}
        <Card>
          <SectionTitle icon={Package} title="Order Progress" />
          <OrderTimeline orderStatus={order.orderStatus} />
        </Card>

        {/* ── Order items ────────────────────────────────── */}
        <Card>
          <SectionTitle icon={Package} title={`Items (${order.items?.length ?? 0})`} />
          <OrderItems items={order.items ?? []} farmerName={order.farmer?.name} />
        </Card>

        {/* ── Price breakdown ────────────────────────────── */}
        <Card>
          <SectionTitle icon={CreditCard} title="Price Breakdown" />
          <div className="space-y-2.5">
            <PriceLine label="Subtotal"      value={order.subtotal} />
            <PriceLine label="Delivery"      value={order.deliveryCost} />
            {order.serviceFee > 0 && (
              <PriceLine label="Service Fee" value={order.serviceFee} />
            )}
            <PriceLine label="Tax"           value={order.tax} />
            <div className="border-t border-slate-100 pt-2.5 mt-2.5">
              <PriceLine label="Total" value={order.totalAmount} bold />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
            <p className="text-slate-400 text-xs">Payment Status</p>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full
              ${order.paymentStatus === "paid"
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"}`}
            >
              {order.paymentStatus === "paid" ? "Paid" : "Pending"}
            </span>
          </div>
        </Card>

        {/* ── Delivery address ───────────────────────────── */}
        {addr.fullName && (
          <Card>
            <SectionTitle icon={MapPin} title="Delivery Address" />
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-slate-700 text-sm font-medium">
                <User size={13} className="text-slate-400" />
                {addr.fullName}
              </div>
              {addr.phone && (
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Phone size={13} className="text-slate-400" />
                  {addr.phone}
                </div>
              )}
              <div className="flex items-start gap-2 text-slate-500 text-sm">
                <MapPin size={13} className="text-slate-400 mt-0.5 shrink-0" />
                <span>
                  {[addr.street, addr.city, addr.state, addr.postalCode]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </div>
            </div>
          </Card>
        )}

      </div>
    </div>
  );
}

/* ── Price line helper ──────────────────────────────────────── */
function PriceLine({ label, value, bold }) {
  return (
    <div className="flex items-center justify-between">
      <p className={`text-sm ${bold ? "text-slate-800 font-bold" : "text-slate-500"}`}>{label}</p>
      <p className={`text-sm ${bold ? "text-slate-800 font-bold" : "text-slate-700"}`}>
        {formatCurrency(value ?? 0)}
      </p>
    </div>
  );
}

/* ── Page header ────────────────────────────────────────────── */
function DetailHeader({ onBack, orderId }) {
  return (
    <div className="bg-white border-b border-slate-100 shadow-sm">
      <div className="max-w-3xl mx-auto px-6 py-5 flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label="Back to orders"
          className="text-slate-400 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-slate-900 font-bold text-lg">Order Details</h1>
          {orderId && <p className="text-slate-400 text-xs">{orderId}</p>}
        </div>
      </div>
    </div>
  );
}
