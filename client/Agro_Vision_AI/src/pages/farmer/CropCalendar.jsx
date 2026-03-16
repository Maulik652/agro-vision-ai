import React, { useState, useEffect, useCallback } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Plus, Check, X, ChevronLeft, ChevronRight, Clock,
  Droplets, Sprout, Bug, FlaskConical, Scissors, Eye, Wheat,
  Loader2, Trash2, AlertTriangle, RefreshCw, Zap
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getCalendarActivities, generateCalendar, addCalendarActivity,
  updateCalendarActivity, deleteCalendarActivity, getUpcomingActivities
} from "../../api/farmerApi";
import toast from "react-hot-toast";

const ACTIVITY_TYPES = [
  { key: "sowing", label: "Sowing", icon: Sprout, cls: "bg-emerald-100 text-emerald-700" },
  { key: "irrigation", label: "Irrigation", icon: Droplets, cls: "bg-sky-100 text-sky-700" },
  { key: "fertilizer", label: "Fertilizer", icon: FlaskConical, cls: "bg-amber-100 text-amber-700" },
  { key: "pesticide", label: "Pesticide", icon: Bug, cls: "bg-red-100 text-red-700" },
  { key: "weeding", label: "Weeding", icon: Scissors, cls: "bg-lime-100 text-lime-700" },
  { key: "pruning", label: "Pruning", icon: Scissors, cls: "bg-teal-100 text-teal-700" },
  { key: "harvesting", label: "Harvesting", icon: Wheat, cls: "bg-yellow-100 text-yellow-700" },
  { key: "observation", label: "Observation", icon: Eye, cls: "bg-cyan-100 text-cyan-700" },
  { key: "transplanting", label: "Transplanting", icon: Sprout, cls: "bg-green-100 text-green-700" },
  { key: "soil-test", label: "Soil Test", icon: FlaskConical, cls: "bg-orange-100 text-orange-700" },
  { key: "other", label: "Other", icon: Zap, cls: "bg-slate-100 text-slate-600" }
];

const TYPE_META = Object.fromEntries(ACTIVITY_TYPES.map((t) => [t.key, t]));

const PRIORITY_COLORS = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-slate-100 text-slate-600 border-slate-200"
};

const STATUS_COLORS = {
  upcoming: "bg-sky-100 text-sky-700",
  "in-progress": "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  skipped: "bg-slate-100 text-slate-500",
  overdue: "bg-red-100 text-red-700"
};

const CROP_OPTIONS = ["Wheat", "Rice", "Tomato", "Cotton", "Maize", "Soybean", "Groundnut", "Sugarcane", "Mustard", "Onion", "Potato", "Chilli"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.04 } } };

const CropCalendar = () => {
  useAuth();
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [activities, setActivities] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("calendar");
  const [showForm, setShowForm] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [, setSelectedDate] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState({ cropType: "", activityType: "irrigation", title: "", scheduledDate: "", priority: "medium", description: "", cost: "" });
  const [genForm, setGenForm] = useState({ cropType: "Wheat", sowingDate: "" });

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const [calRes, upRes] = await Promise.all([
        getCalendarActivities({ month: currentMonth + 1, year: currentYear }),
        getUpcomingActivities()
      ]);
      if (calRes.success) setActivities(calRes.activities || []);
      if (upRes.success) setUpcoming(upRes.activities || []);
    } catch { toast.error("Failed to load calendar"); }
    finally { setLoading(false); }
  }, [currentMonth, currentYear]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  const getDaysInMonth = (m, y) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (m, y) => new Date(y, m, 1).getDay();
  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);

  const getActivitiesForDate = (day) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return activities.filter((a) => a.scheduledDate?.startsWith(dateStr));
  };

  const navMonth = (dir) => {
    let m = currentMonth + dir, y = currentYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setCurrentMonth(m); setCurrentYear(y);
  };

  const handleGenerate = async () => {
    if (!genForm.cropType || !genForm.sowingDate) return toast.error("Select crop and sowing date");
    setSaving(true);
    try {
      const res = await generateCalendar(genForm.cropType, genForm.sowingDate);
      if (res.success) { toast.success(`Generated ${res.count} activities for ${genForm.cropType}`); setShowGenerate(false); fetchActivities(); }
    } catch { toast.error("Failed to generate calendar"); }
    finally { setSaving(false); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.scheduledDate || !form.activityType) return toast.error("Fill required fields");
    setSaving(true);
    try {
      const res = await addCalendarActivity({ ...form, cost: Number(form.cost) || 0 });
      if (res.success) {
        toast.success("Activity added"); setShowForm(false);
        setForm({ cropType: "", activityType: "irrigation", title: "", scheduledDate: "", priority: "medium", description: "", cost: "" });
        fetchActivities();
      }
    } catch { toast.error("Failed to add activity"); }
    finally { setSaving(false); }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      const payload = { status };
      if (status === "completed") payload.completedDate = new Date().toISOString();
      const res = await updateCalendarActivity(id, payload);
      if (res.success) {
        toast.success(`Marked as ${status}`);
        setActivities((prev) => prev.map((a) => a._id === id ? { ...a, ...payload } : a));
        setUpcoming((prev) => prev.filter((a) => a._id !== id || status === "in-progress"));
      }
    } catch { toast.error("Failed to update"); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteCalendarActivity(id);
      toast.success("Deleted"); setConfirmDelete(null);
      setActivities((prev) => prev.filter((a) => a._id !== id));
      setUpcoming((prev) => prev.filter((a) => a._id !== id));
    } catch { toast.error("Failed to delete"); }
  };

  const isToday = (day) => day === now.getDate() && currentMonth === now.getMonth() && currentYear === now.getFullYear();
  const filteredActivities = filterType === "all" ? activities : activities.filter((a) => a.activityType === filterType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-900">
              <div className="w-12 h-12 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center">
                <Calendar size={24} className="text-green-700" />
              </div>
              Crop Calendar
            </h1>
            <p className="text-slate-500 text-sm mt-1">Plan, schedule, and track every farming activity</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowGenerate(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-100 border border-amber-200 hover:bg-amber-200 text-amber-700 transition text-sm font-medium">
              <Zap size={14} /> Auto-Generate
            </button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-700 hover:bg-green-800 text-white transition text-sm font-medium shadow-sm">
              <Plus size={14} /> Add Activity
            </button>
          </div>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {["calendar", "list", "upcoming"].map((v) => (
              <button key={v} onClick={() => setView(v)} className={`px-4 py-2 rounded-lg text-xs font-medium transition capitalize ${view === v ? "bg-green-700 text-white" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}>
                {v === "upcoming" ? `Upcoming (${upcoming.length})` : v}
              </button>
            ))}
          </div>
          {upcoming.length > 0 && view !== "upcoming" && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs">
              <AlertTriangle size={14} /> {upcoming.length} tasks due this week
            </div>
          )}
        </div>

        {loading && <div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-green-700" /></div>}

        {/* ═══ CALENDAR VIEW ═══ */}
        {!loading && view === "calendar" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-4 px-2">
              <button onClick={() => navMonth(-1)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition"><ChevronLeft size={18} /></button>
              <h2 className="text-lg font-semibold text-slate-800">{MONTHS[currentMonth]} {currentYear}</h2>
              <button onClick={() => navMonth(1)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition"><ChevronRight size={18} /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="text-center text-xs text-slate-400 py-2 font-medium">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="h-24 rounded-lg" />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayActivities = getActivitiesForDate(day);
                const today = isToday(day);
                return (
                  <div key={day} onClick={() => { setSelectedDate(day); setView("list"); setFilterType("all"); }}
                    className={`h-24 rounded-lg border cursor-pointer transition-all overflow-hidden p-1.5 ${today ? "border-green-400 bg-green-50" : "border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-200"}`}>
                    <div className={`text-xs font-medium mb-1 ${today ? "text-green-700" : "text-slate-500"}`}>{day}</div>
                    <div className="space-y-0.5">
                      {dayActivities.slice(0, 3).map((a) => {
                        const meta = TYPE_META[a.activityType] || TYPE_META.other;
                        return <div key={a._id} className={`text-[9px] truncate px-1 py-0.5 rounded ${meta.cls}`}>{a.title}</div>;
                      })}
                      {dayActivities.length > 3 && <div className="text-[9px] text-slate-400 px-1">+{dayActivities.length - 3} more</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ═══ LIST VIEW ═══ */}
        {!loading && view === "list" && (
          <motion.div variants={stagger} initial="hidden" animate="visible">
            <div className="flex flex-wrap gap-2 mb-6">
              <button onClick={() => setFilterType("all")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterType === "all" ? "bg-green-700 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}>All</button>
              {ACTIVITY_TYPES.map((t) => (
                <button key={t.key} onClick={() => setFilterType(t.key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition capitalize flex items-center gap-1 ${filterType === t.key ? "bg-green-700 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}>
                  <t.icon size={11} /> {t.label}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {filteredActivities.map((a) => {
                const meta = TYPE_META[a.activityType] || TYPE_META.other;
                const IconComp = meta.icon;
                const dateStr = a.scheduledDate ? new Date(a.scheduledDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
                return (
                  <motion.div key={a._id} variants={fadeUp} className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-100 hover:border-green-300 transition group shadow-sm">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${meta.cls}`}>
                      <IconComp size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-medium text-slate-800 truncate">{a.title}</h4>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${PRIORITY_COLORS[a.priority] || PRIORITY_COLORS.medium}`}>{a.priority}</span>
                        {a.cropType && <span className="text-[10px] text-slate-400">{a.cropType}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><Clock size={10} /> {dateStr}</span>
                        {a.cost > 0 && <span>₹{a.cost.toLocaleString()}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-[10px] font-medium ${STATUS_COLORS[a.status] || STATUS_COLORS.upcoming}`}>{a.status}</span>
                      {a.status !== "completed" && a.status !== "skipped" && (
                        <button onClick={() => handleStatusUpdate(a._id, "completed")} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 bg-emerald-100 hover:bg-emerald-200 transition" title="Mark complete">
                          <Check size={14} className="text-emerald-700" />
                        </button>
                      )}
                      <button onClick={() => setConfirmDelete(a._id)} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 bg-red-100 hover:bg-red-200 transition" title="Delete">
                        <Trash2 size={14} className="text-red-600" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
              {filteredActivities.length === 0 && (
                <div className="py-16 text-center">
                  <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-400">No activities for this month</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ═══ UPCOMING VIEW ═══ */}
        {!loading && view === "upcoming" && (
          <motion.div variants={stagger} initial="hidden" animate="visible">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" /> Due This Week
            </h3>
            <div className="space-y-3">
              {upcoming.map((a) => {
                const meta = TYPE_META[a.activityType] || TYPE_META.other;
                const IconComp = meta.icon;
                const dateStr = a.scheduledDate ? new Date(a.scheduledDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : "";
                const daysLeft = a.scheduledDate ? Math.max(0, Math.ceil((new Date(a.scheduledDate) - now) / 86400000)) : 0;
                return (
                  <motion.div key={a._id} variants={fadeUp} className={`flex items-center gap-4 p-4 rounded-xl border transition ${daysLeft <= 1 ? "bg-red-50 border-red-200" : "bg-white border-slate-100"}`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${meta.cls}`}>
                      <IconComp size={18} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-slate-800">{a.title}</h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        <span>{dateStr}</span>
                        <span className={daysLeft <= 1 ? "text-red-600 font-semibold" : "text-amber-600"}>
                          {daysLeft === 0 ? "Today!" : daysLeft === 1 ? "Tomorrow" : `${daysLeft} days left`}
                        </span>
                        {a.cropType && <span>{a.cropType}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleStatusUpdate(a._id, "in-progress")} className="px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-xs text-amber-700 transition">Start</button>
                      <button onClick={() => handleStatusUpdate(a._id, "completed")} className="px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-xs text-emerald-700 transition">Done</button>
                    </div>
                  </motion.div>
                );
              })}
              {upcoming.length === 0 && (
                <div className="py-16 text-center">
                  <Check size={48} className="mx-auto text-emerald-500 mb-4" />
                  <p className="text-slate-400">All caught up! No tasks due this week.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ─── Auto-Generate Modal ─── */}
        <AnimatePresence>
          {showGenerate && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
              onClick={() => setShowGenerate(false)}>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 max-w-md w-full">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-4"><Zap size={18} className="text-amber-500" /> Auto-Generate Crop Calendar</h3>
                <p className="text-sm text-slate-500 mb-4">Select your crop and sowing date. We'll generate a complete activity schedule with scientifically recommended timings.</p>
                <div className="space-y-3 mb-6">
                  <select value={genForm.cropType} onChange={(e) => setGenForm({ ...genForm, cropType: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700 outline-none">
                    {CROP_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input type="date" value={genForm.sowingDate} onChange={(e) => setGenForm({ ...genForm, sowingDate: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700 outline-none" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowGenerate(false)} className="flex-1 py-2.5 rounded-lg bg-slate-100 border border-slate-200 text-sm text-slate-600 hover:bg-slate-200 transition">Cancel</button>
                  <button onClick={handleGenerate} disabled={saving} className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} Generate
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Add Activity Modal ─── */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
              onClick={() => setShowForm(false)}>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2"><Plus size={18} className="text-green-700" /> Add Activity</h3>
                  <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X size={18} /></button>
                </div>
                <form onSubmit={handleAdd} className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Title *</label>
                    <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g. Apply urea 40kg/acre"
                      className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-green-500" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Type *</label>
                      <select value={form.activityType} onChange={(e) => setForm({ ...form, activityType: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700 outline-none appearance-none">
                        {ACTIVITY_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Crop</label>
                      <select value={form.cropType} onChange={(e) => setForm({ ...form, cropType: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700 outline-none appearance-none">
                        <option value="">Select</option>
                        {CROP_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Date *</label>
                      <input type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700 outline-none focus:border-green-500" required />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Priority</label>
                      <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700 outline-none appearance-none">
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Cost (₹)</label>
                    <input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })}
                      placeholder="0" min="0"
                      className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700 outline-none focus:border-green-500" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Description</label>
                    <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={2} placeholder="Details..."
                      className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700 outline-none resize-none" />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-lg bg-slate-100 border border-slate-200 text-sm text-slate-600 hover:bg-slate-200 transition">Cancel</button>
                    <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg bg-green-700 hover:bg-green-800 text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition">
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Add
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Delete Confirmation ─── */}
        <AnimatePresence>
          {confirmDelete && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
              onClick={() => setConfirmDelete(null)}>
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 max-w-sm w-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center"><AlertTriangle size={20} className="text-red-600" /></div>
                  <h3 className="text-lg font-semibold text-slate-900">Delete Activity?</h3>
                </div>
                <p className="text-sm text-slate-500 mb-6">This action cannot be undone.</p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-lg bg-slate-100 border border-slate-200 text-sm text-slate-600 hover:bg-slate-200 transition">Cancel</button>
                  <button onClick={() => handleDelete(confirmDelete)} className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition">Delete</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CropCalendar;
