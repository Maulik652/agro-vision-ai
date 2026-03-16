/**
 * ProfileDropdown — compact dropdown from navbar avatar.
 * Quick links + open full profile panel + logout.
 */
import { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, ShoppingBag, Wallet, BarChart2,
  User, LogOut, ChevronRight, Sparkles,
} from "lucide-react";

const ROLE_GRADIENT = {
  buyer:  "from-emerald-500 to-green-600",
  farmer: "from-amber-500 to-orange-600",
  expert: "from-blue-500 to-indigo-600",
  admin:  "from-purple-500 to-violet-600",
};

const ROLE_BADGE = {
  buyer:  "bg-emerald-100 text-emerald-700",
  farmer: "bg-amber-100 text-amber-700",
  expert: "bg-blue-100 text-blue-700",
  admin:  "bg-purple-100 text-purple-700",
};

const QUICK_LINKS = {
  buyer:  [
    { icon: LayoutDashboard, label: "Dashboard",   path: "/buyer/dashboard"   },
    { icon: ShoppingBag,     label: "Marketplace", path: "/buyer/marketplace" },
    { icon: ShoppingBag,     label: "Orders",      path: "/buyer/orders"      },
    { icon: Wallet,          label: "Wallet",      path: "/buyer/wallet"      },
    { icon: BarChart2,       label: "Analytics",   path: "/buyer/analytics"   },
  ],
  farmer: [
    { icon: LayoutDashboard, label: "Dashboard",  path: "/farmer/dashboard"  },
    { icon: Sparkles,        label: "AI Scan",    path: "/farmer/scan"       },
    { icon: BarChart2,       label: "Predictions",path: "/farmer/predictions"},
    { icon: Wallet,          label: "Finance",    path: "/farmer/finance"    },
  ],
  expert: [
    { icon: LayoutDashboard, label: "Dashboard",  path: "/expert/dashboard"  },
    { icon: ShoppingBag,     label: "Advisory",   path: "/expert/advisory"   },
    { icon: BarChart2,       label: "Reports",    path: "/expert/reports"    },
  ],
  admin: [
    { icon: LayoutDashboard, label: "Admin Panel",path: "/admin/dashboard"   },
  ],
};

export default function ProfileDropdown({ user, open, onClose, onOpenProfile, onLogout }) {
  const navigate = useNavigate();
  const ref      = useRef(null);
  const role     = user?.role?.toLowerCase() || "buyer";
  const gradient = ROLE_GRADIENT[role] || ROLE_GRADIENT.buyer;
  const badge    = ROLE_BADGE[role]    || ROLE_BADGE.buyer;
  const links    = QUICK_LINKS[role]   || [];
  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  const go = (path) => { onClose(); navigate(path); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, scale: 0.92, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: -8 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="absolute right-0 top-full mt-3 w-72 rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden z-[200]"
        >
          {/* User card */}
          <div className={`bg-gradient-to-br ${gradient} p-4`}>
            <div className="flex items-center gap-3">
              {user?.photo ? (
                <img src={user.photo} alt={user.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-white/50" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white font-bold text-lg">
                  {initials}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm truncate">{user?.name || "User"}</p>
                <p className="text-white/70 text-xs truncate">{user?.email || ""}</p>
                <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize bg-white/20 text-white`}>
                  {role}
                </span>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="p-2">
            <p className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quick Access</p>
            {links.map(({ icon: Icon, label, path }) => (
              <button
                key={path}
                onClick={() => go(path)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-700 hover:bg-slate-50 transition group"
              >
                <Icon size={15} className="text-slate-400 group-hover:text-green-600 transition" />
                <span className="flex-1 text-left">{label}</span>
                <ChevronRight size={13} className="text-slate-300 group-hover:text-slate-500 transition" />
              </button>
            ))}
          </div>

          <div className="border-t border-slate-100 p-2">
            {/* View full profile */}
            <button
              onClick={() => { onClose(); onOpenProfile(); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-700 hover:bg-green-50 transition group"
            >
              <User size={15} className="text-slate-400 group-hover:text-green-600 transition" />
              <span className="flex-1 text-left font-medium">View & Edit Profile</span>
              <ChevronRight size={13} className="text-slate-300 group-hover:text-green-500 transition" />
            </button>

            {/* Logout */}
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 transition"
            >
              <LogOut size={15} />
              <span className="flex-1 text-left">Sign Out</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
