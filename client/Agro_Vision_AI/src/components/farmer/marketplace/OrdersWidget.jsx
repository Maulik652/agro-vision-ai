import { motion } from "framer-motion";
import { ShoppingCart, Package, Truck, CheckCircle, Clock, XCircle, ChevronRight, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getRecentOrders } from "../../../api/farmerMarketplaceApi";
import { updateOrderStatus } from "../../../api/marketplaceApi";
import useOrderStatusSocket from "../../../hooks/useOrderStatusSocket";

const STATUS_CONFIG = {
  pending: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", label: "Pending" },
  confirmed: { icon: CheckCircle, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", label: "Confirmed" },
  processing: { icon: Package, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200", label: "Processing" },
  shipped: { icon: Truck, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200", label: "Shipped" },
  delivered: { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", label: "Delivered" },
  completed: { icon: CheckCircle, color: "text-emerald-700", bg: "bg-emerald-100", border: "border-emerald-300", label: "Completed" },
  cancelled: { icon: XCircle, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200", label: "Cancelled" },
};

const NEXT_STATUS = { pending: "confirmed", confirmed: "processing", processing: "shipped", shipped: "delivered", delivered: "completed" };

function OrderRow({ order, onUpdate }) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  const next = NEXT_STATUS[order.status];

  const { mutate: advance, isPending } = useMutation({
    mutationFn: () => updateOrderStatus(order._id, { status: next }),
    onSuccess: () => { toast.success(`Order marked as ${next}`); onUpdate?.(); },
    onError: (e) => toast.error(e?.response?.data?.message || "Update failed"),
  });

  const buyer = order.buyer?.name || "Buyer";
  const cropName = order.cropName || order.items?.[0]?.cropName || "Crop";
  const amount = order.totalAmount || 0;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 hover:bg-slate-50 transition">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${cfg.bg} ${cfg.border} border`}>
        <Icon size={14} className={cfg.color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-bold text-slate-800 truncate">{cropName}</p>
          <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${cfg.bg} ${cfg.border} ${cfg.color}`}>{cfg.label}</span>
        </div>
        <p className="text-[10px] text-slate-500">{buyer} · {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-black text-emerald-700">₹{amount.toLocaleString("en-IN")}</p>
        {next && (
          <button onClick={() => advance()} disabled={isPending} className="mt-0.5 text-[9px] font-bold text-blue-600 hover:text-blue-800 transition disabled:opacity-50">
            {isPending ? "..." : `→ ${next}`}
          </button>
        )}
      </div>
    </div>
  );
}

export default function OrdersWidget({ compact = false, onTabSwitch }) {
  const qc = useQueryClient();

  // Real-time order status updates from admin panel
  useOrderStatusSocket({ queryKeys: ["farmerOrders", "farmerMarketSummary"], showToast: true });

  const { data, isLoading } = useQuery({
    queryKey: ["farmerOrders"],
    queryFn: () => getRecentOrders({ limit: compact ? 5 : 20 }),
    staleTime: 30000,
    retry: 1,
  });

  const orders = data?.orders || data || [];

  const handleUpdate = () => {
    qc.invalidateQueries({ queryKey: ["farmerOrders"] });
    qc.invalidateQueries({ queryKey: ["farmerMarketSummary"] });
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-xl bg-slate-200 animate-pulse" />
          <div className="h-4 w-28 rounded bg-slate-200 animate-pulse" />
        </div>
        {[1,2,3].map((i) => <div key={i} className="mb-2 h-14 rounded-xl bg-slate-100 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${compact ? "p-4" : "p-6"}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100"><ShoppingCart size={15} className="text-blue-600" /></div>
          <div>
            <h3 className="text-sm font-black text-slate-800">Orders</h3>
            <p className="text-[10px] text-slate-500">{orders.length} order{orders.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        {compact && onTabSwitch && (
          <button onClick={onTabSwitch} className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition">
            View all <ChevronRight size={12} />
          </button>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <ShoppingCart size={24} className="text-slate-300" />
          <p className="text-sm font-semibold text-slate-500">No orders yet</p>
          <p className="text-xs text-slate-400">Orders will appear here once buyers purchase</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => <OrderRow key={o._id} order={o} onUpdate={handleUpdate} />)}
        </div>
      )}
    </div>
  );
}
