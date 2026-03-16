import { motion } from "framer-motion";
import { MessageSquare, ShoppingBasket, ShoppingCart, Truck, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ACTIONS = [
  {
    id: "marketplace",
    label: "Browse Marketplace",
    description: "Discover fresh crop listings",
    icon: ShoppingBasket,
    gradient: "from-green-600 to-emerald-500",
    bg: "bg-green-50",
    iconColor: "text-green-700",
    border: "hover:border-green-300",
    path: "/buyer/marketplace"
  },
  {
    id: "cart",
    label: "View Cart",
    description: "Review items before checkout",
    icon: ShoppingCart,
    gradient: "from-teal-600 to-emerald-500",
    bg: "bg-teal-50",
    iconColor: "text-teal-700",
    border: "hover:border-teal-300",
    path: "/buyer/cart"
  },
  {
    id: "orders",
    label: "Track Orders",
    description: "Check delivery status",
    icon: Truck,
    gradient: "from-amber-500 to-orange-500",
    bg: "bg-amber-50",
    iconColor: "text-amber-600",
    border: "hover:border-amber-300",
    path: "/buyer/orders"
  },
  {
    id: "chat",
    label: "Chat with Farmers",
    description: "Negotiate directly",
    icon: MessageSquare,
    gradient: "from-slate-600 to-slate-500",
    bg: "bg-slate-100",
    iconColor: "text-slate-600",
    border: "hover:border-slate-300",
    path: "/buyer/chat"
  }
];

const QuickActions = () => {
  const navigate = useNavigate();

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="inline-flex rounded-xl bg-slate-100 p-2.5">
          <Zap size={18} className="text-slate-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Quick Actions</h2>
          <p className="text-sm text-slate-500">Jump to key pages instantly</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {ACTIONS.map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.id}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.07 }}
              whileHover={{ y: -4, boxShadow: "0 16px 32px -8px rgba(0,0,0,0.12)" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(action.path)}
              className={`group relative overflow-hidden flex flex-col items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all ${action.border}`}
            >
              {/* gradient top bar */}
              <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${action.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
              <div className={`inline-flex rounded-xl p-3 ${action.bg}`}>
                <Icon size={20} className={action.iconColor} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{action.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{action.description}</p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};

export default QuickActions;
