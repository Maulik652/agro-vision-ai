import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, Calendar, MapPin, Package, Leaf } from "lucide-react";
import OrderTimeline from "./OrderTimeline.jsx";

const fmt = (iso) => new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const cur = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const STATUS_CONFIG = {
  pending_payment: { label: "Pending Payment", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  paid:            { label: "Paid",            color: "bg-blue-100 text-blue-700 border-blue-200"       },
  processing:      { label: "Processing",      color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  shipped:         { label: "Shipped",         color: "bg-orange-100 text-orange-700 border-orange-200" },
  delivered:       { label: "Delivered",       color: "bg-teal-100 text-teal-700 border-teal-200"       },
  completed:       { label: "Completed",       color: "bg-green-100 text-green-700 border-green-200"    },
  cancelled:       { label: "Cancelled",       color: "bg-red-100 text-red-700 border-red-200"          },
};

export default function OrderCard({ order, index }) {
  const navigate = useNavigate();
  const items = order.items ?? [];
  const firstItem = items[0];
  const extraCount = items.length - 1;
  const cfg = STATUS_CONFIG[order.orderStatus] ?? { label: order.orderStatus, color: "bg-slate-100 text-slate-600 border-slate-200" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-green-100 transition-all duration-200 overflow-hidden"
    >
      {/* ── Top bar: order meta + status ── */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Order ID</p>
            <p className="text-slate-700 font-bold text-xs mt-0.5">{order.orderId}</p>
          </div>
          <div className="hidden sm:block w-px h-6 bg-slate-200" />
          <div className="hidden sm:block">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Placed On</p>
            <p className="text-slate-700 text-xs font-medium mt-0.5 flex items-center gap-1">
              <Calendar size={10} className="text-slate-400" />{fmt(order.createdAt)}
            </p>
          </div>
          {order.farmer?.name && (
            <>
              <div className="hidden sm:block w-px h-6 bg-slate-200" />
              <div className="hidden sm:block">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Farmer</p>
                <p className="text-slate-700 text-xs font-medium mt-0.5">{order.farmer.name}</p>
              </div>
            </>
          )}
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full border font-semibold whitespace-nowrap text-[11px] px-2.5 py-1 shrink-0 ${cfg.color}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
          {cfg.label}
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* ── Item preview ── */}
        <div className="flex items-center gap-4">
          {/* Crop image / icon */}
          <div className="w-16 h-16 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center shrink-0 overflow-hidden">
            {firstItem?.cropImage
              ? <img src={firstItem.cropImage} alt={firstItem.cropName} className="w-full h-full object-cover" />
              : <Leaf size={24} className="text-green-400" />
            }
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-slate-800 font-semibold text-sm truncate">
              {firstItem?.cropName ?? "Crop Order"}
            </p>
            {firstItem && (
              <p className="text-slate-400 text-xs mt-0.5">
                {firstItem.quantity} {firstItem.unit ?? "kg"} · ₹{firstItem.pricePerKg}/{firstItem.unit ?? "kg"}
              </p>
            )}
            {extraCount > 0 && (
              <p className="text-green-700 text-xs font-semibold mt-1">+{extraCount} more item{extraCount > 1 ? "s" : ""}</p>
            )}
            {order.deliveryAddress?.city && (
              <p className="text-slate-400 text-xs mt-1 flex items-center gap-1">
                <MapPin size={10} className="shrink-0" />
                {order.deliveryAddress.city}{order.deliveryAddress.state ? `, ${order.deliveryAddress.state}` : ""}
              </p>
            )}
          </div>

          {/* Amount */}
          <div className="text-right shrink-0">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Total</p>
            <p className="text-slate-900 font-bold text-lg">{cur(order.totalAmount)}</p>
            <p className="text-slate-400 text-[10px]">{items.length} item{items.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* ── Timeline ── */}
        <OrderTimeline orderStatus={order.orderStatus} />

        {/* ── Actions ── */}
        <div className="flex items-center justify-between pt-1 gap-3 flex-wrap">
          {order.estimatedDelivery && order.orderStatus !== "completed" && order.orderStatus !== "cancelled" && (
            <p className="text-slate-400 text-xs flex items-center gap-1">
              <Package size={11} className="shrink-0" />
              Est. delivery: <span className="font-medium text-slate-600 ml-1">{fmt(order.estimatedDelivery)}</span>
            </p>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => navigate(`/buyer/orders/${order.orderId}`)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-700 text-white text-xs font-semibold hover:bg-green-800 transition-all"
            >
              View Details <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
