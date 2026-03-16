import { motion } from "framer-motion";
import { Package, User } from "lucide-react";

const PLACEHOLDER = "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=120&q=70";

function ItemRow({ item }) {
  return (
    <div className="flex items-center gap-4 py-3.5">
      <img
        src={item.cropImage || PLACEHOLDER}
        alt={item.cropName}
        loading="lazy"
        onError={(e) => { e.target.src = PLACEHOLDER; }}
        className="w-14 h-14 rounded-xl object-cover bg-slate-100 shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-slate-800 font-semibold text-sm truncate">{item.cropName}</p>
        <p className="text-slate-400 text-xs mt-0.5">
          ₹{item.pricePerKg}/{item.unit ?? "kg"} × {item.quantity} {item.unit ?? "kg"}
        </p>
      </div>
      <p className="text-slate-800 font-bold text-sm shrink-0">
        ₹{item.subtotal?.toFixed(2) ?? (item.pricePerKg * item.quantity).toFixed(2)}
      </p>
    </div>
  );
}

export default function PaymentSummary({ orders = [] }) {
  return (
    <div className="space-y-4">
      <h2 className="text-slate-800 font-bold text-base flex items-center gap-2">
        <Package size={16} className="text-green-700" /> Order Items
      </h2>

      {orders.map((order, oi) => (
        <motion.div
          key={order._id ?? oi}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: oi * 0.07 }}
          className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm"
        >
          {/* Farmer header */}
          <div className="flex items-center gap-2.5 px-5 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
            <div className="w-7 h-7 rounded-full bg-green-700 flex items-center justify-center shrink-0">
              <User size={13} className="text-white" />
            </div>
            <div>
              <p className="text-green-800 text-xs font-bold">{order.farmer?.name ?? "Farmer"}</p>
              <p className="text-green-600 text-[10px]">Order #{order.orderId}</p>
            </div>
            <span className={`ml-auto px-2.5 py-1 rounded-full text-[10px] font-bold ${
              order.paymentStatus === "paid"
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}>
              {order.paymentStatus === "paid" ? "Paid" : "Pending"}
            </span>
          </div>

          {/* Items */}
          <div className="px-5 divide-y divide-slate-50">
            {order.items?.map((item, ii) => (
              <ItemRow key={ii} item={item} />
            ))}
          </div>

          {/* Sub-order total */}
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between text-xs">
            <span className="text-slate-400">Order subtotal</span>
            <span className="text-slate-700 font-semibold">₹{order.subtotal?.toFixed(2)}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
