import { Package } from "lucide-react";

export default function OrderContextBanner({ conversation }) {
  if (!conversation?.orderId && !conversation?.cropName) return null;

  return (
    <div className="mx-4 mt-3 mb-1 flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-2.5">
      <Package size={15} className="text-green-600 shrink-0" />
      <div className="text-xs">
        {conversation.orderId && (
          <span className="text-green-800 font-semibold mr-2">
            Order #{conversation.orderId}
          </span>
        )}
        {conversation.cropName && (
          <span className="text-green-700">Crop: {conversation.cropName}</span>
        )}
      </div>
    </div>
  );
}
