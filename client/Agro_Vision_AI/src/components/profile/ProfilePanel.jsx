/**
 * ProfilePanel — full-screen overlay profile panel.
 * Opens over the entire page (not a route). Closes with ESC or X.
 * Sections: Overview, Edit Info, Security, Notifications, Switch Role.
 */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, User, Shield, Bell, RefreshCcw, Camera,
  Mail, Phone, MapPin, Save, Eye, EyeOff,
  CheckCircle2, Leaf, ShoppingBag, Star, HelpCircle,
  LogOut, ChevronRight, Sparkles, Activity,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import api from "../../api/axios.js";
import toast from "react-hot-toast";

/* ── Role config ─────────────────────────────────────────────── */
const ROLE_GRADIENT = {
  buyer:  "from-emerald-500 to-green-600",
  farmer: "from-amber-500 to-orange-600",
  expert: "from-blue-500 to-indigo-600",
  admin:  "from-purple-500 to-violet-600",
};
const ROLE_ICON = { buyer: ShoppingBag, farmer: Leaf, expert: Star, admin: Sparkles };
const ROLE_COLOR = {
  buyer:  "text-emerald-600 bg-emerald-50 border-emerald-200",
  farmer: "text-amber-600 bg-amber-50 border-amber-200",
  expert: "text-blue-600 bg-blue-50 border-blue-200",
  admin:  "text-purple-600 bg-purple-50 border-purple-200",
};

/* ── Sidebar nav items ───────────────────────────────────────── */
const NAV = [
  { id: "overview",      icon: User,       label: "Overview"       },
  { id: "edit",          icon: Save,        label: "Edit Profile"   },
  { id: "security",      icon: Shield,      label: "Security"       },
  { id: "notifications", icon: Bell,        label: "Notifications"  },
  { id: "switch-role",   icon: RefreshCcw,  label: "Switch Role"    },
  { id: "activity",      icon: Activity,    label: "Activity"       },
  { id: "help",          icon: HelpCircle,  label: "Help Center"    },
];

/* ── Stat card ───────────────────────────────────────────────── */
const StatCard = ({ label, value, color }) => (
  <div className={`rounded-2xl border p-4 ${color}`}>
    <p className="text-2xl font-bold">{value}</p>
    <p className="text-xs mt-0.5 opacity-70">{label}</p>
  </div>
);

/* ── Section wrapper ─────────────────────────────────────────── */
const Section = ({ title, children }) => (
  <div className="space-y-4">
    <h3 className="text-base font-bold text-slate-800">{title}</h3>
    {children}
  </div>
);

/* ── Input field ─────────────────────────────────────────────── */
const Field = ({ label, icon: Icon, ...props }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-500 mb-1.5">{label}</label>
    <div className="relative">
      {Icon && <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />}
      <input
        className={`w-full ${Icon ? "pl-9" : "pl-3"} pr-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:border-green-400 focus:bg-white transition`}
        {...props}
      />
    </div>
  </div>
);

export default function ProfilePanel({ open, onClose, onLogout }) {
  const { user, login } = useAuth();
  const [tab,       setTab]       = useState("overview");
  const [form,      setForm]      = useState({ name: "", phone: "", location: "", bio: "" });
  const [pwForm,    setPwForm]    = useState({ current: "", next: "", confirm: "" });
  const [showPw,    setShowPw]    = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [notifs,    setNotifs]    = useState({ orders: true, prices: true, chat: true, promos: false });
  const fileRef = useRef(null);

  const role     = user?.role?.toLowerCase() || "buyer";
  const gradient = ROLE_GRADIENT[role] || ROLE_GRADIENT.buyer;
  const RoleIcon = ROLE_ICON[role] || ShoppingBag;
  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  // Sync form with user data
  useEffect(() => {
    if (user) {
      setForm({
        name:     user.name     || "",
        phone:    user.phone    || "",
        location: user.location || "",
        bio:      user.bio      || "",
      });
    }
  }, [user]);

  // ESC to close
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { data } = await api.put("/auth/profile", form);
      const updated = { ...user, ...data.user };
      login(updated, localStorage.getItem("token"));
      toast.success("Profile updated!");
    } catch {
      toast.error("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (pwForm.next !== pwForm.confirm) { toast.error("Passwords don't match"); return; }
    if (pwForm.next.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setSaving(true);
    try {
      await api.put("/auth/change-password", { currentPassword: pwForm.current, newPassword: pwForm.next });
      toast.success("Password changed!");
      setPwForm({ current: "", next: "", confirm: "" });
    } catch {
      toast.error("Failed to change password.");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Convert to base64 so we don't need multer
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const { data } = await api.post("/auth/upload-photo", { photo: reader.result });
        const updated = { ...user, photo: data.photo };
        login(updated, localStorage.getItem("token"));
        toast.success("Photo updated!");
      } catch {
        toast.error("Photo upload failed.");
      }
    };
    reader.readAsDataURL(file);
  };

  /* ── Tab content ─────────────────────────────────────────── */
  const renderContent = () => {
    switch (tab) {

      case "overview": return (
        <div className="space-y-6">
          {/* Hero card */}
          <div className={`rounded-2xl bg-gradient-to-br ${gradient} p-6 text-white`}>
            <div className="flex items-center gap-4">
              <div className="relative">
                {user?.photo ? (
                  <img src={user.photo} alt={user.name} className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white/40" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold">
                    {initials}
                  </div>
                )}
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow"
                >
                  <Camera size={11} className="text-slate-600" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>
              <div>
                <p className="text-xl font-bold">{user?.name || "User"}</p>
                <p className="text-white/70 text-sm">{user?.email}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <RoleIcon size={12} />
                  <span className="text-xs font-semibold capitalize bg-white/20 px-2 py-0.5 rounded-full">{role}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Member Since" value={user?.createdAt ? new Date(user.createdAt).getFullYear() : "2024"} color="border-slate-100 text-slate-700" />
            <StatCard label="Role" value={role.charAt(0).toUpperCase() + role.slice(1)} color={`border ${ROLE_COLOR[role]}`} />
            <StatCard label="Status" value="Active" color="border-green-100 text-green-700" />
          </div>

          {/* Info rows */}
          <div className="rounded-2xl border border-slate-100 bg-white divide-y divide-slate-50">
            {[
              { icon: Mail,    label: "Email",    value: user?.email    || "—" },
              { icon: Phone,   label: "Phone",    value: user?.phone    || "—" },
              { icon: MapPin,  label: "Location", value: user?.location || "—" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3">
                <Icon size={14} className="text-slate-400 shrink-0" />
                <span className="text-xs text-slate-400 w-20">{label}</span>
                <span className="text-sm text-slate-700 font-medium">{value}</span>
              </div>
            ))}
            {user?.bio && (
              <div className="px-4 py-3">
                <p className="text-xs text-slate-400 mb-1">Bio</p>
                <p className="text-sm text-slate-700">{user.bio}</p>
              </div>
            )}
          </div>

          <button
            onClick={() => setTab("edit")}
            className="w-full py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition"
          >
            Edit Profile
          </button>
        </div>
      );

      case "edit": return (
        <Section title="Edit Profile">
          <div className="space-y-4">
            {/* Avatar */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              {user?.photo ? (
                <img src={user.photo} alt="" className="w-14 h-14 rounded-xl object-cover" />
              ) : (
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-lg`}>
                  {initials}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-slate-700">Profile Photo</p>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="mt-1 text-xs text-green-600 font-medium hover:underline"
                >
                  Upload new photo
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>
            </div>

            <Field label="Full Name"    icon={User}   value={form.name}     onChange={(e) => setForm({ ...form, name: e.target.value })}     placeholder="Your full name" />
            <Field label="Phone"        icon={Phone}  value={form.phone}    onChange={(e) => setForm({ ...form, phone: e.target.value })}    placeholder="+91 XXXXX XXXXX" />
            <Field label="Location"     icon={MapPin} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="City, State" />

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Bio</label>
              <textarea
                rows={3}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Tell us about yourself..."
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:border-green-400 focus:bg-white transition resize-none"
              />
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60 transition flex items-center justify-center gap-2"
            >
              {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </Section>
      );

      case "security": return (
        <Section title="Security">
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex gap-3">
              <Shield size={16} className="text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">Use a strong password with at least 8 characters, including numbers and symbols.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Current Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={pwForm.current}
                    onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                    placeholder="Current password"
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:border-green-400 focus:bg-white transition"
                  />
                  <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <Field label="New Password"     value={pwForm.next}    onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}    type="password" placeholder="New password" />
              <Field label="Confirm Password" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} type="password" placeholder="Confirm new password" />
            </div>

            <button
              onClick={handleChangePassword}
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900 disabled:opacity-60 transition"
            >
              {saving ? "Updating..." : "Update Password"}
            </button>

            {/* 2FA teaser */}
            <div className="p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">Two-Factor Authentication</p>
                <p className="text-xs text-slate-400 mt-0.5">Add an extra layer of security</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200 font-semibold">Coming Soon</span>
            </div>
          </div>
        </Section>
      );

      case "notifications": return (
        <Section title="Notification Preferences">
          <div className="space-y-3">
            {[
              { key: "orders",  label: "Order Updates",       desc: "Status changes, delivery alerts"   },
              { key: "prices",  label: "Price Alerts",        desc: "Crop price drops and spikes"        },
              { key: "chat",    label: "Chat Messages",       desc: "New messages from farmers"          },
              { key: "promos",  label: "Promotions & Deals",  desc: "Exclusive offers and discounts"     },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                </div>
                <button
                  onClick={() => setNotifs((n) => ({ ...n, [key]: !n[key] }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${notifs[key] ? "bg-green-500" : "bg-slate-200"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${notifs[key] ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
            ))}
          </div>
        </Section>
      );

      case "switch-role": return (
        <Section title="Switch Role">
          <p className="text-xs text-slate-500">Your account supports multiple roles. Switch to access a different panel.</p>
          <div className="space-y-3 mt-2">
            {["buyer", "farmer", "expert"].map((r) => {
              const Icon = ROLE_ICON[r] || ShoppingBag;
              const active = role === r;
              return (
                <div
                  key={r}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition cursor-pointer ${
                    active ? "border-green-400 bg-green-50" : "border-slate-100 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ROLE_COLOR[r]}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800 capitalize">{r}</p>
                    <p className="text-xs text-slate-400">
                      {r === "buyer" ? "Browse and purchase crops" : r === "farmer" ? "List and manage your crops" : "Provide expert advisory"}
                    </p>
                  </div>
                  {active && <CheckCircle2 size={18} className="text-green-500" />}
                </div>
              );
            })}
            <p className="text-xs text-slate-400 text-center pt-1">Contact support to enable additional roles on your account.</p>
          </div>
        </Section>
      );

      case "activity": return (
        <Section title="Recent Activity">
          <div className="space-y-2">
            {[
              { label: "Logged in",          time: "Just now",    color: "bg-green-400"  },
              { label: "Profile viewed",     time: "2 min ago",   color: "bg-blue-400"   },
              { label: "Order placed",       time: "1 hour ago",  color: "bg-amber-400"  },
              { label: "Wallet topped up",   time: "Yesterday",   color: "bg-purple-400" },
              { label: "Password changed",   time: "3 days ago",  color: "bg-slate-400"  },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className={`w-2 h-2 rounded-full ${item.color} shrink-0`} />
                <span className="text-sm text-slate-700 flex-1">{item.label}</span>
                <span className="text-xs text-slate-400">{item.time}</span>
              </div>
            ))}
          </div>
        </Section>
      );

      case "help": return (
        <Section title="Help Center">
          <div className="space-y-3">
            {[
              { q: "How do I place an order?",         a: "Go to Marketplace, select a crop, add to cart, and checkout." },
              { q: "How does the wallet work?",        a: "Top up your wallet and use it to pay for orders instantly."   },
              { q: "How are AI predictions generated?",a: "Our stacked ensemble model analyses your order history and market data." },
              { q: "How do I contact a farmer?",       a: "Use the Chat feature on any crop listing or order page."      },
            ].map(({ q, a }, i) => (
              <details key={i} className="group rounded-2xl border border-slate-100 bg-white overflow-hidden">
                <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-sm font-semibold text-slate-700 list-none">
                  {q}
                  <ChevronRight size={14} className="text-slate-400 group-open:rotate-90 transition-transform" />
                </summary>
                <p className="px-4 pb-3 text-xs text-slate-500 leading-relaxed">{a}</p>
              </details>
            ))}
            <div className="p-4 rounded-2xl bg-green-50 border border-green-100 text-center">
              <p className="text-sm font-semibold text-green-700">Need more help?</p>
              <p className="text-xs text-green-600 mt-1">Email us at <span className="font-medium">support@agrovision.ai</span></p>
            </div>
          </div>
        </Section>
      );

      default: return null;
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm"
          />

          {/* Panel — slides in from right */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 bottom-0 z-[301] w-full max-w-md bg-[#f8fafc] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className={`bg-gradient-to-r ${gradient} px-6 py-5 flex items-center justify-between shrink-0`}>
              <div className="flex items-center gap-3">
                {user?.photo ? (
                  <img src={user.photo} alt="" className="w-10 h-10 rounded-xl object-cover ring-2 ring-white/40" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold">
                    {initials}
                  </div>
                )}
                <div>
                  <p className="text-white font-bold text-sm">{user?.name || "User"}</p>
                  <p className="text-white/70 text-xs capitalize">{role}</p>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
                <X size={16} className="text-white" />
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar */}
              <div className="w-16 bg-white border-r border-slate-100 flex flex-col items-center py-4 gap-1 shrink-0">
                {NAV.map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    title={label}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
                      tab === id
                        ? "bg-green-600 text-white shadow-sm"
                        : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    }`}
                  >
                    <Icon size={16} />
                  </button>
                ))}
                {/* Logout at bottom */}
                <div className="flex-1" />
                <button
                  onClick={onLogout}
                  title="Sign Out"
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition"
                >
                  <LogOut size={16} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={tab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    {renderContent()}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
