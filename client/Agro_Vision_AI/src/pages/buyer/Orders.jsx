import { useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, RefreshCw, CheckCircle2, Search,
  ShoppingBag, Truck, Clock, XCircle, BarChart2, Filter,
} from "lucide-react";
import toast from "react-hot-toast";
import { fetchBuyerOrders } from "../../services/orderAPI.js";
import useOrderStore from "../../store/orderStore.js";
import OrderCard from "../../components/orders/OrderCard.jsx";
import OrdersSkeleton from "../../components/orders/OrdersSkeleton.jsx";

const FILTERS = [
  { value: "all",             label: "All Orders",  icon: ShoppingBag },
  { value: "pending_payment", label: "Pending",     icon: Clock       },
  { value: "processing",      label: "Processing",  icon: RefreshCw   },
  { value: "shipped",         label: "Shipped",     icon: Truck       },
  { value: "delivered",       label: "Delivered",   icon: CheckCircle2},
  { value: "completed",       label: "Completed",   icon: BarChart2   },
  { value: "cancelled",       label: "Cancelled",   icon: XCircle     },
];

const STAT_CONFIG = [
  { key: "all",       label: "Total",     color: "bg-slate-50 border-slate-200 text-slate-700",   dot: "bg-slate-400"   },
  { key: "processing",label: "Active",    color: "bg-blue-50 border-blue-200 text-blue-700",      dot: "bg-blue-500"    },
  { key: "shipped",   label: "Shipped",   color: "bg-orange-50 border-orange-200 text-orange-700",dot: "bg-orange-500"  },
  { key: "completed", label: "Completed", color: "bg-green-50 border-green-200 text-green-700",   dot: "bg-green-500"   },
];

export default function Orders() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const showSuccess = searchParams.get("success") === "1";
  const { statusFilter, setStatusFilter } = useOrderStore();
  const [search, setSearch] = useState("");

  const { data: orders, isLoading, isError, refetch } = useQuery({
    queryKey: ["buyer-orders"],
    queryFn: fetchBuyerOrders,
    staleTime: 120_000,
    onError: () => toast.error("Failed to load orders"),
  });

  const filtered = useMemo(() => {
    if (!orders) return [];
    let list = statusFilter === "all" ? orders : orders.filter((o) => o.orderStatus === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((o) =>
        o.orderId?.toLowerCase().includes(q) ||
        o.farmer?.name?.toLowerCase().includes(q) ||
        o.items?.some((i) => i.cropName?.toLowerCase().includes(q))
      );
    }
    return list;
  }, [orders, statusFilter, search]);

  if (isLoading) return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Header />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8"><OrdersSkeleton /></div>
    </div>
  );

  if (isError) return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
          <XCircle size={28} className="text-red-400" />
        </div>
        <p className="text-slate-600 font-medium">Failed to load orders</p>
        <button onClick={() => refetch()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-700 text-white text-sm font-semibold mx-auto hover:bg-green-800 transition">
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    </div>
  );

  const countOf = (key) => key === "all" ? (orders?.length ?? 0) : (orders?.filter((o) => o.orderStatus === key).length ?? 0);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Header />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Success banner */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-5 py-4">
              <CheckCircle2 size={20} className="text-green-600 shrink-0" />
              <div>
                <p className="text-green-800 font-semibold text-sm">Order placed successfully</p>
                <p className="text-green-600 text-xs mt-0.5">Your payment was confirmed and the order is being processed.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STAT_CONFIG.map(({ key, label, color, dot }) => (
            <button key={key} onClick={() => setStatusFilter(key)}
              className={`rounded-2xl border p-4 text-left transition-all hover:shadow-sm ${color} ${statusFilter === key ? "ring-2 ring-offset-1 ring-green-400" : ""}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${dot}`} />
                <span className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</span>
              </div>
              <p className="text-2xl font-bold">{countOf(key)}</p>
            </button>
          ))}
        </div>

        {/* Search + filter row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order ID, farmer, or crop..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-green-400 transition" />
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2 py-1 overflow-x-auto scrollbar-none shrink-0">
            <Filter size={13} className="text-slate-400 shrink-0 ml-1" />
            {FILTERS.map((f) => (
              <button key={f.value} onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all
                  ${statusFilter === f.value ? "bg-green-700 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
                {f.label}
                {f.value !== "all" && orders && countOf(f.value) > 0 && (
                  <span className={`ml-1.5 text-[10px] ${statusFilter === f.value ? "opacity-80" : "opacity-50"}`}>
                    {countOf(f.value)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between">
          <p className="text-slate-500 text-sm">
            {filtered.length === 0 ? "No orders found" : `${filtered.length} order${filtered.length !== 1 ? "s" : ""}`}
            {search && <span className="ml-1 text-slate-400">for "{search}"</span>}
          </p>
          {(search || statusFilter !== "all") && (
            <button onClick={() => { setSearch(""); setStatusFilter("all"); }}
              className="text-xs text-green-700 font-semibold hover:underline">
              Clear filters
            </button>
          )}
        </div>

        {/* Orders list */}
        {filtered.length === 0 ? (
          <EmptyState onShop={() => navigate("/buyer/marketplace")} />
        ) : (
          <div className="space-y-4">
            {filtered.map((order, i) => (
              <OrderCard key={order._id ?? order.orderId} order={order} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="bg-white border-b border-slate-100 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-700 flex items-center justify-center shrink-0">
          <Package size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-slate-900 font-bold text-xl">My Orders</h1>
          <p className="text-slate-400 text-xs mt-0.5">Track and manage all your crop purchases</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onShop }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-3xl bg-green-50 flex items-center justify-center mb-5">
        <ShoppingBag size={32} className="text-green-400" />
      </div>
      <p className="text-slate-700 font-semibold text-lg mb-1">No orders yet</p>
      <p className="text-slate-400 text-sm mb-6 max-w-xs">Browse the marketplace and place your first order to see it here.</p>
      <button onClick={onShop}
        className="px-6 py-2.5 rounded-xl bg-green-700 text-white text-sm font-semibold hover:bg-green-800 transition">
        Browse Marketplace
      </button>
    </div>
  );
}
