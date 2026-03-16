import { motion } from "framer-motion";
import { ClipboardList } from "lucide-react";

const STATUS_CONFIG = {
  pending:    { bg: "bg-amber-100",   text: "text-amber-700",   dot: "bg-amber-500" },
  confirmed:  { bg: "bg-green-100",   text: "text-green-700",   dot: "bg-green-600" },
  processing: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  shipped:    { bg: "bg-teal-100",    text: "text-teal-700",    dot: "bg-teal-500" },
  delivered:  { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  cancelled:  { bg: "bg-red-100",     text: "text-red-700",     dot: "bg-red-500" }
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${cfg.bg} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
};

const RecentOrders = ({ orders, isLoading }) => {
  const rows = Array.isArray(orders) ? orders : [];

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="inline-flex rounded-xl bg-green-50 p-2.5">
          <ClipboardList size={18} className="text-green-700" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Recent Orders</h2>
          <p className="text-sm text-slate-500">Latest purchase activity</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : rows.length ? (
        <div className="overflow-x-auto -mx-1">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Order ID", "Crop", "Farmer", "Qty", "Status"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((order, index) => (
                <motion.tr
                  key={`${order.orderId}_${index}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.04 }}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition"
                >
                  <td className="px-3 py-3 font-mono text-xs font-semibold text-slate-700">
                    #{String(order.orderId || "").slice(-8)}
                  </td>
                  <td className="px-3 py-3 font-medium text-slate-900">{order.crop}</td>
                  <td className="px-3 py-3 text-slate-600">{order.farmer}</td>
                  <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                    {Number(order.quantity || 0).toLocaleString("en-IN")} {order.quantityUnit}
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
          No recent orders found.
        </div>
      )}
    </section>
  );
};

export default RecentOrders;
