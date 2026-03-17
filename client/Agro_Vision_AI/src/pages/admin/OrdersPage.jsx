import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { fetchAdminOrders, updateOrderStatus } from "../../api/adminApi";
import toast from "react-hot-toast";

const STATUS_BADGE = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function OrdersPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders", { status, page }],
    queryFn: () => fetchAdminOrders({ status, page, limit: 20 }),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status: s }) => updateOrderStatus(id, s),
    onSuccess: () => { qc.invalidateQueries(["admin-orders"]); toast.success("Order updated"); },
    onError: () => toast.error("Failed"),
  });

  const orders = data?.data || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
          Order Control Tower
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">{total} total orders</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["", "pending", "confirmed", "shipped", "delivered", "cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              status === s
                ? "bg-green-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {["Order ID", "Buyer", "Amount", "Items", "Status", "Date", "Update Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                    ))}</tr>
                  ))
                : orders.map((o) => (
                    <motion.tr key={o._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-mono text-slate-600 text-xs">#{o._id?.toString().slice(-8)}</td>
                      <td className="px-4 py-3 text-slate-700">{o.buyer?.name || "—"}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">₹{(o.totalAmount || 0).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-slate-500">{o.items?.length || 0}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_BADGE[o.status] || "bg-slate-100 text-slate-600"}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{new Date(o.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <select
                          value={o.status}
                          onChange={(e) => statusMut.mutate({ id: o._id, status: e.target.value })}
                          className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-white outline-none"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                    </motion.tr>
                  ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-400">Page {page} of {pages}</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Prev</button>
              <button disabled={page === pages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
