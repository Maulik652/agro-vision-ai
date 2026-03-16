import { motion } from "framer-motion";
import { ShoppingBag, ArrowRight, Leaf } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function EmptyCart() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-24 text-center px-4"
    >
      {/* Illustration */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="relative mb-6"
      >
        <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-green-50 to-emerald-100 border border-green-100 shadow-sm flex items-center justify-center">
          <ShoppingBag size={48} className="text-green-300" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-green-100 border border-green-200 flex items-center justify-center">
          <Leaf size={14} className="text-green-600" />
        </div>
      </motion.div>

      <h2 className="text-slate-800 font-bold text-xl mb-2">Your cart is empty</h2>
      <p className="text-slate-400 text-sm mb-8 max-w-xs leading-relaxed">
        Discover fresh crops from verified farmers across India and add them to your cart.
      </p>

      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate("/buyer/marketplace")}
        className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-green-700 hover:bg-green-800 text-white font-semibold text-sm transition-colors shadow-sm"
      >
        Browse Marketplace <ArrowRight size={15} />
      </motion.button>
    </motion.div>
  );
}
