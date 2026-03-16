/**
 * OrderStatusBadge — compact colored pill, never overflows.
 */
const STATUS_CONFIG = {
  pending_payment: { label: "Pending",    color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  paid:            { label: "Paid",       color: "bg-blue-100 text-blue-700 border-blue-200"       },
  processing:      { label: "Processing", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  shipped:         { label: "Shipped",    color: "bg-orange-100 text-orange-700 border-orange-200" },
  delivered:       { label: "Delivered",  color: "bg-teal-100 text-teal-700 border-teal-200"       },
  completed:       { label: "Completed",  color: "bg-green-100 text-green-700 border-green-200"    },
  cancelled:       { label: "Cancelled",  color: "bg-red-100 text-red-700 border-red-200"          },
};

export default function OrderStatusBadge({ status, size = "sm" }) {
  const cfg      = STATUS_CONFIG[status] ?? { label: status, color: "bg-slate-100 text-slate-600 border-slate-200" };
  const sizeClass = size === "lg" ? "text-sm px-3 py-1" : "text-[11px] px-2 py-0.5";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-semibold whitespace-nowrap shrink-0 ${cfg.color} ${sizeClass}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80 shrink-0" />
      {cfg.label}
    </span>
  );
}
