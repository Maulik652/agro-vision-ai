import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, Sprout, ShoppingBag, Package,
  CreditCard, BrainCircuit, Star, ShieldAlert, BarChart3,
  Settings, Activity, Zap, Bell, ChevronLeft, ChevronRight,
  Leaf, MessageSquare, GraduationCap, BookOpen, Wallet,
  Users2, FileText, ScanLine, BarChart2, PieChart, Megaphone,
  Menu, X,
} from "lucide-react";

const NAV_GROUPS = [
  {
    group: "Overview",
    items: [
      { label: "Command Center",     icon: LayoutDashboard, to: "/admin" },
    ],
  },
  {
    group: "Users",
    items: [
      { label: "All Users",          icon: Users,           to: "/admin/users" },
      { label: "Farmers",            icon: Sprout,          to: "/admin/farmers" },
      { label: "Experts",            icon: GraduationCap,   to: "/admin/experts" },
    ],
  },
  {
    group: "Commerce",
    items: [
      { label: "Marketplace",        icon: ShoppingBag,     to: "/admin/marketplace" },
      { label: "Orders",             icon: Package,         to: "/admin/orders" },
      { label: "Payments",           icon: CreditCard,      to: "/admin/payments" },
      { label: "Wallet & Escrow",    icon: Wallet,          to: "/admin/wallet" },
    ],
  },
  {
    group: "Engagement",
    items: [
      { label: "Consultations",      icon: MessageSquare,   to: "/admin/consultations" },
      { label: "Advisories",         icon: BookOpen,        to: "/admin/advisories" },
      { label: "Community",          icon: Users2,          to: "/admin/community" },
      { label: "Schemes",            icon: FileText,        to: "/admin/schemes" },
    ],
  },
  {
    group: "Intelligence",
    items: [
      { label: "AI Control",         icon: BrainCircuit,    to: "/admin/ai" },
      { label: "Scan Reports",       icon: ScanLine,        to: "/admin/scan-reports" },
      { label: "Reviews",            icon: Star,            to: "/admin/reviews" },
      { label: "Review Analytics",   icon: BarChart2,       to: "/admin/review-analytics" },
      { label: "Platform Analytics", icon: PieChart,        to: "/admin/platform-analytics" },
    ],
  },
  {
    group: "System",
    items: [
      { label: "Fraud Alerts",       icon: ShieldAlert,     to: "/admin/fraud" },
      { label: "Reports Lab",        icon: BarChart3,       to: "/admin/reports" },
      { label: "Activity Logs",      icon: Activity,        to: "/admin/activity-logs" },
      { label: "Automation",         icon: Zap,             to: "/admin/automation" },
      { label: "Broadcast",          icon: Megaphone,       to: "/admin/broadcast" },
      { label: "Notifications",      icon: Bell,            to: "/admin/notifications" },
      { label: "Settings",           icon: Settings,        to: "/admin/settings" },
    ],
  },
];

// Flat list for collapsed icon-only mode
const NAV_FLAT = NAV_GROUPS.flatMap((g) => g.items);

function NavItem({ label, icon: Icon, to, collapsed }) {
  return (
    <NavLink
      to={to}
      end={to === "/admin"}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative ${
          isActive
            ? "bg-white/15 text-white"
            : "text-green-100/70 hover:bg-white/10 hover:text-white"
        }`
      }
      title={collapsed ? label : undefined}
    >
      {({ isActive }) => (
        <>
          {/* Active indicator bar */}
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-white" />
          )}
          <Icon
            size={17}
            className={`shrink-0 ${isActive ? "text-white" : "text-green-200/60 group-hover:text-white"}`}
          />
          {!collapsed && (
            <span className="truncate leading-none">{label}</span>
          )}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const sidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10 shrink-0">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/15 border border-white/20 shrink-0">
          <Leaf size={18} className="text-white" />
        </div>
        {(!collapsed || isMobile) && (
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight truncate" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
              AgroVision
            </p>
            <p className="text-green-200 text-xs font-medium">Admin Console</p>
          </div>
        )}
        {isMobile && (
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4
        scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {(collapsed && !isMobile ? [{ group: null, items: NAV_FLAT }] : NAV_GROUPS).map(({ group, items }) => (
          <div key={group || "all"}>
            {group && !collapsed && (
              <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-green-300/50">
                {group}
              </p>
            )}
            <div className="space-y-0.5">
              {items.map((item) => (
                <NavItem key={item.to} {...item} collapsed={collapsed && !isMobile} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom: collapse toggle (desktop only) */}
      {!isMobile && (
        <div className="shrink-0 px-2 py-3 border-t border-white/10">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-green-200/70 hover:bg-white/10 hover:text-white transition text-xs font-medium"
          >
            {collapsed ? <ChevronRight size={15} /> : (
              <>
                <ChevronLeft size={15} />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* ── Mobile hamburger trigger (shown in AdminLayout topbar area) ── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-40 flex items-center justify-center w-9 h-9 rounded-xl bg-[#14532d] text-white shadow-lg"
      >
        <Menu size={18} />
      </button>

      {/* ── Mobile overlay drawer ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="fixed left-0 top-0 z-50 h-full w-64 bg-[#14532d] shadow-2xl lg:hidden"
            >
              {sidebarContent(true)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Desktop sidebar ── */}
      <motion.aside
        animate={{ width: collapsed ? 68 : 240 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="hidden lg:flex flex-col h-screen bg-[#14532d] shrink-0 overflow-hidden"
        style={{ minWidth: collapsed ? 68 : 240 }}
      >
        {sidebarContent(false)}
      </motion.aside>
    </>
  );
}
