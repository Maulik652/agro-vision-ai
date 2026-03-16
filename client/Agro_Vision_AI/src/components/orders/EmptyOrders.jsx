/**
 * EmptyOrders — shown when buyer has no orders
 */
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";

export default function EmptyOrders() {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      {/* Illustration */}
      <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center mb-6">
        <ShoppingBag size={40} className="text-green-400" />
      </div>
      <h3 className="text-slate-700 font-semibold text-lg mb-2">No orders yet</h3>
      <p className="text-slate-400 text-sm mb-8 max-w-xs">
        You haven't placed any orders. Browse the marketplace to find fresh crops from local farmers.
      </p>
      <button
        onClick={() => navigate("/buyer/marketplace")}
        className="px-6 py-2.5 rounded-xl bg-green-700 text-white text-sm font-semibold hover:bg-green-800 transition-all"
      >
        Browse Marketplace
      </button>
    </motion.div>
  );
}
