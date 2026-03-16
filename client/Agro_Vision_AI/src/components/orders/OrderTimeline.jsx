/**
 * OrderTimeline — horizontal stepper, no scroll, fits any screen width.
 */
import { CheckCircle2, Clock, Circle, XCircle } from "lucide-react";

const STEPS = [
  { key: "pending_payment", label: "Placed"     },
  { key: "paid",            label: "Paid"       },
  { key: "processing",      label: "Processing" },
  { key: "shipped",         label: "Shipped"    },
  { key: "delivered",       label: "Delivered"  },
  { key: "completed",       label: "Completed"  },
];

const STATUS_ORDER = {
  pending_payment: 0,
  paid:            1,
  processing:      2,
  shipped:         3,
  delivered:       4,
  completed:       5,
  cancelled:       -1,
};

export default function OrderTimeline({ orderStatus }) {
  const currentIdx  = STATUS_ORDER[orderStatus] ?? 0;
  const isCancelled = orderStatus === "cancelled";

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 rounded-xl border border-red-100">
        <XCircle size={15} className="text-red-500 shrink-0" />
        <p className="text-red-600 text-xs font-medium">Order cancelled</p>
      </div>
    );
  }

  return (
    <div className="flex items-center w-full">
      {STEPS.map((step, i) => {
        const done   = i < currentIdx;
        const active = i === currentIdx;
        const isLast = i === STEPS.length - 1;

        return (
          <div key={step.key} className="flex items-center flex-1 min-w-0">
            {/* Step node + label */}
            <div className="flex flex-col items-center shrink-0">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all
                  ${done   ? "bg-green-600 text-white"
                  : active ? "bg-white border-2 border-green-600 text-green-600"
                  :          "bg-slate-100 text-slate-300 border border-slate-200"}`}
              >
                {done
                  ? <CheckCircle2 size={12} />
                  : active
                    ? <Clock size={11} />
                    : <Circle size={11} />
                }
              </div>
              {/* Label: hidden on xs, visible sm+ */}
              <span
                className={`hidden sm:block mt-1 text-[9px] font-semibold text-center leading-tight w-12 truncate
                  ${done ? "text-green-600" : active ? "text-slate-700" : "text-slate-400"}`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector */}
            {!isLast && (
              <div className={`flex-1 h-0.5 mx-0.5 rounded-full ${done ? "bg-green-400" : "bg-slate-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
