/**
 * TransactionBadge — colored label for transaction category
 */
const CONFIG = {
  topup:          { label: "Top-up",        color: "bg-blue-100 text-blue-700" },
  order_payment:  { label: "Order Payment", color: "bg-orange-100 text-orange-700" },
  refund:         { label: "Refund",        color: "bg-green-100 text-green-700" },
  escrow_release: { label: "Escrow",        color: "bg-purple-100 text-purple-700" },
};

export default function TransactionBadge({ category }) {
  const cfg = CONFIG[category] ?? { label: category, color: "bg-slate-100 text-slate-600" };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}
