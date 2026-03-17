import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Search, ChevronDown, LogOut, User, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchNotificationsCenter, fetchAdminProfile } from "../../api/adminApi";
import { useNavigate } from "react-router-dom";

const COMMANDS = [
  { label: "Show top farmers", path: "/admin/farmers" },
  { label: "Detect fraud today", path: "/admin/fraud" },
  { label: "Revenue last 7 days", path: "/admin/payments" },
  { label: "Pending orders", path: "/admin/orders" },
  { label: "AI model stats", path: "/admin/ai" },
  { label: "User management", path: "/admin/users" },
  { label: "Platform settings", path: "/admin/settings" },
  { label: "Automation rules", path: "/admin/automation" },
];

export default function Topbar() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showCmd, setShowCmd] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const cmdRef = useRef(null);

  const { data: profile } = useQuery({ queryKey: ["admin-profile"], queryFn: fetchAdminProfile });
  const { data: notifications = [] } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: fetchNotificationsCenter,
    refetchInterval: 30000,
  });

  const filtered = COMMANDS.filter((c) =>
    c.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShowCmd(true);
      }
      if (e.key === "Escape") { setShowCmd(false); setSearch(""); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleCommand = (path) => {
    navigate(path);
    setShowCmd(false);
    setSearch("");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <>
      <header className="flex items-center justify-between px-4 lg:px-6 py-3.5 bg-white border-b border-slate-100 sticky top-0 z-30">
        {/* AI Command Bar — offset on mobile for hamburger */}
        <button
          onClick={() => setShowCmd(true)}
          className="flex items-center gap-3 px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-sm hover:border-green-300 hover:bg-green-50/50 transition w-48 sm:w-72 ml-10 lg:ml-0"
        >
          <Search size={14} />
          <span>AI Command Bar...</span>
          <kbd className="ml-auto text-xs bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded">⌘K</kbd>
        </button>

        <div className="flex items-center gap-3">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotif((v) => !v)}
              className="relative flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition"
            >
              <Bell size={16} className="text-slate-600" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {Math.min(notifications.length, 9)}
                </span>
              )}
            </button>
            <AnimatePresence>
              {showNotif && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-12 w-80 bg-white rounded-2xl border border-slate-100 shadow-xl z-50 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="font-semibold text-slate-800 text-sm">Notifications</p>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.slice(0, 8).map((n, i) => (
                      <div key={i} className="px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition">
                        <p className="text-sm text-slate-700 font-medium">{n.title || n.message}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{new Date(n.createdAt).toLocaleString()}</p>
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <p className="text-center text-slate-400 text-sm py-6">No notifications</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setShowProfile((v) => !v)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <Shield size={13} className="text-white" />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-slate-800 leading-tight">{profile?.name || "Admin"}</p>
                <p className="text-[10px] text-green-600 font-medium">Super Admin</p>
              </div>
              <ChevronDown size={13} className="text-slate-400" />
            </button>
            <AnimatePresence>
              {showProfile && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-12 w-48 bg-white rounded-2xl border border-slate-100 shadow-xl z-50 overflow-hidden"
                >
                  <button className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition">
                    <User size={14} /> Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition border-t border-slate-100"
                  >
                    <LogOut size={14} /> Logout
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* AI Command Modal */}
      <AnimatePresence>
        {showCmd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center pt-24"
            onClick={() => { setShowCmd(false); setSearch(""); }}
          >
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
                <Search size={16} className="text-green-600" />
                <input
                  ref={cmdRef}
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Type a command or search..."
                  className="flex-1 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
                <kbd className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">ESC</kbd>
              </div>
              <div className="py-2 max-h-72 overflow-y-auto">
                {filtered.map((cmd, i) => (
                  <button
                    key={i}
                    onClick={() => handleCommand(cmd.path)}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-green-50 hover:text-green-700 transition text-left"
                  >
                    <Search size={13} className="text-slate-400" />
                    {cmd.label}
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="text-center text-slate-400 text-sm py-6">No commands found</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
