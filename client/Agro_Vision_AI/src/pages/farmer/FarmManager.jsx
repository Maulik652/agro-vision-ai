import React, { useState, useEffect, useCallback } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Plus, Pencil, Trash2, Sprout, Droplets, Mountain,
  Ruler, Leaf, SunMedium, ChevronDown, X, Check, AlertTriangle,
  Layers, BarChart3, Calendar, Loader2, RefreshCw, Search
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getFarmFields, addFarmField, updateFarmField, deleteFarmField, getFarmFieldsSummary
} from "../../api/farmerApi";
import toast from "react-hot-toast";

/* ─── Constants ─── */
const SOIL_TYPES = ["clay", "sandy", "loamy", "silt", "red", "black", "laterite", "alluvial", "other"];
const WATER_SOURCES = ["borewell", "canal", "river", "rain-fed", "pond", "drip", "sprinkler", "other"];
const SEASONS = ["kharif", "rabi", "zaid", "perennial"];
const STATUSES = ["active", "fallow", "harvested", "preparing"];
const UNITS = ["acre", "hectare", "bigha", "gunta"];
const CROP_OPTIONS = ["Wheat", "Rice", "Tomato", "Cotton", "Maize", "Soybean", "Groundnut", "Sugarcane", "Mustard", "Onion", "Potato", "Chilli"];

const STATUS_COLORS = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  fallow: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  harvested: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  preparing: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const SOIL_ICONS = {
  clay: "🟤", sandy: "🏖️", loamy: "🌱", silt: "💧", red: "🔴",
  black: "⬛", laterite: "🟠", alluvial: "🌊", other: "🪨"
};

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.06 } } };

const EMPTY_FORM = {
  fieldName: "", cropType: "", fieldSize: "", unit: "acre", soilType: "loamy",
  waterSource: "borewell", sowingDate: "", season: "kharif", notes: "",
  location: { city: "", state: "" }
};

const FarmManager = () => {
  const { user } = useAuth();
  const [fields, setFields] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [confirmDelete, setConfirmDelete] = useState(null);

  /* ─── Fetch ─── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [fieldsRes, summaryRes] = await Promise.all([
        getFarmFields(),
        getFarmFieldsSummary()
      ]);
      if (fieldsRes.success) setFields(fieldsRes.fields || []);
      if (summaryRes.success) setSummary(summaryRes.summary || null);
    } catch {
      toast.error("Failed to load farm data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ─── Add / Edit ─── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fieldName.trim()) return toast.error("Field name is required");
    setSaving(true);
    try {
      const payload = {
        ...form,
        fieldSize: Number(form.fieldSize) || 0,
        location: {
          city: form.location?.city || user?.city || "",
          state: form.location?.state || user?.state || ""
        }
      };
      if (editingId) {
        const res = await updateFarmField(editingId, payload);
        if (res.success) {
          toast.success("Field updated");
          setFields((prev) => prev.map((f) => f._id === editingId ? res.field : f));
        }
      } else {
        const res = await addFarmField(payload);
        if (res.success) {
          toast.success("Field added");
          setFields((prev) => [res.field, ...prev]);
        }
      }
      resetForm();
      fetchData();
    } catch {
      toast.error("Failed to save field");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  };

  const openEdit = (field) => {
    setEditingId(field._id);
    setForm({
      fieldName: field.fieldName || "",
      cropType: field.cropType || "",
      fieldSize: field.fieldSize || "",
      unit: field.unit || "acre",
      soilType: field.soilType || "loamy",
      waterSource: field.waterSource || "borewell",
      sowingDate: field.sowingDate ? field.sowingDate.split("T")[0] : "",
      season: field.season || "kharif",
      notes: field.notes || "",
      location: { city: field.location?.city || "", state: field.location?.state || "" }
    });
    setShowForm(true);
  };

  /* ─── Delete ─── */
  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      const res = await deleteFarmField(id);
      if (res.success) {
        toast.success("Field deleted");
        setFields((prev) => prev.filter((f) => f._id !== id));
        setConfirmDelete(null);
        fetchData();
      }
    } catch {
      toast.error("Failed to delete field");
    } finally {
      setDeleting(null);
    }
  };

  /* ─── Filtered Fields ─── */
  const filtered = fields.filter((f) => {
    const matchSearch = !search || f.fieldName?.toLowerCase().includes(search.toLowerCase()) || f.cropType?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || f.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-emerald-950 to-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ─── Header ─── */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-linear-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Layers size={24} />
              </div>
              <span className="bg-linear-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent">Farm Manager</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">Manage your fields, track crops, and monitor soil health</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchData} className="p-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition" title="Refresh"><RefreshCw size={16} /></button>
            <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 transition font-medium text-sm shadow-lg shadow-emerald-600/20">
              <Plus size={16} /> Add Field
            </button>
          </div>
        </motion.div>

        {/* ─── Summary Cards ─── */}
        {summary && (
          <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Fields", value: summary.totalFields, icon: Layers, color: "emerald" },
              { label: "Total Area", value: `${summary.totalArea?.toFixed(1)} acres`, icon: Ruler, color: "blue" },
              { label: "Active Fields", value: summary.statusBreakdown?.active || 0, icon: Sprout, color: "green" },
              { label: "Crops Grown", value: Object.keys(summary.cropDistribution || {}).length, icon: Leaf, color: "amber" }
            ].map((card) => (
              <motion.div key={card.label} variants={fadeUp} className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-${card.color}-500/20 flex items-center justify-center`}>
                    <card.icon size={18} className={`text-${card.color}-400`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{card.value}</p>
                    <p className="text-xs text-slate-500">{card.label}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ─── Crop Distribution ─── */}
        {summary?.cropDistribution && Object.keys(summary.cropDistribution).length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8 p-5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2"><BarChart3 size={14} /> Crop Distribution</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(summary.cropDistribution).map(([crop, area]) => (
                <div key={crop} className="px-3 py-1.5 rounded-full bg-emerald-900/30 border border-emerald-700/30 text-xs">
                  <span className="text-emerald-400 font-medium">{crop}</span>
                  <span className="text-slate-500 ml-1.5">{typeof area === "number" ? area.toFixed(1) : area} acres</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ─── Search & Filter ─── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 flex items-center bg-white/5 border border-white/10 rounded-xl px-4 focus-within:border-emerald-500/50 transition">
            <Search size={16} className="text-slate-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search fields or crops..." className="flex-1 bg-transparent py-2.5 px-3 text-sm outline-none text-white placeholder-slate-500" />
          </div>
          <div className="flex gap-2">
            {["all", ...STATUSES].map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-2 rounded-lg text-xs font-medium transition capitalize ${filterStatus === s ? "bg-emerald-600 text-white" : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Loading ─── */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-emerald-500" />
          </div>
        )}

        {/* ─── Field Cards ─── */}
        {!loading && (
          <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((field) => (
              <motion.div key={field._id} variants={fadeUp} className="group p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:border-emerald-500/30 transition-all hover:shadow-lg hover:shadow-emerald-500/5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-linear-to-br from-emerald-600/30 to-green-600/20 flex items-center justify-center text-2xl border border-emerald-700/20">
                      {SOIL_ICONS[field.soilType] || "🌱"}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{field.fieldName}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin size={10} /> {field.location?.city || user?.city}, {field.location?.state || user?.state}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${STATUS_COLORS[field.status] || STATUS_COLORS.active}`}>
                    {field.status}
                  </span>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-2.5 rounded-lg bg-white/5">
                    <p className="text-[10px] text-slate-500 uppercase mb-0.5">Crop</p>
                    <p className="text-sm font-medium text-emerald-400">{field.cropType || "—"}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/5">
                    <p className="text-[10px] text-slate-500 uppercase mb-0.5">Area</p>
                    <p className="text-sm font-medium">{field.fieldSize || 0} {field.unit}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/5">
                    <p className="text-[10px] text-slate-500 uppercase mb-0.5">Soil</p>
                    <p className="text-sm font-medium capitalize">{field.soilType}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/5">
                    <p className="text-[10px] text-slate-500 uppercase mb-0.5">Water</p>
                    <p className="text-sm font-medium capitalize">{field.waterSource}</p>
                  </div>
                </div>

                {/* Season & Sowing */}
                <div className="flex items-center gap-4 mb-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><SunMedium size={12} className="text-amber-400" /> {field.season}</span>
                  {field.sowingDate && (
                    <span className="flex items-center gap-1"><Calendar size={12} className="text-blue-400" /> Sown: {new Date(field.sowingDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                  )}
                </div>

                {/* Soil Health */}
                {field.soilHealth && (field.soilHealth.nitrogen || field.soilHealth.phosphorus || field.soilHealth.potassium) && (
                  <div className="mb-4 p-3 rounded-lg bg-emerald-900/20 border border-emerald-800/20">
                    <p className="text-[10px] font-semibold text-emerald-400 uppercase mb-2">Soil Health (NPK)</p>
                    <div className="flex gap-4 text-xs">
                      <span>N: <strong className="text-emerald-300">{field.soilHealth.nitrogen || "—"}</strong></span>
                      <span>P: <strong className="text-blue-300">{field.soilHealth.phosphorus || "—"}</strong></span>
                      <span>K: <strong className="text-amber-300">{field.soilHealth.potassium || "—"}</strong></span>
                      {field.soilHealth.ph && <span>pH: <strong className="text-purple-300">{field.soilHealth.ph}</strong></span>}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {field.notes && <p className="text-xs text-slate-500 mb-4 line-clamp-2">{field.notes}</p>}

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-white/5">
                  <button onClick={() => openEdit(field)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/5 hover:bg-emerald-600/20 text-sm text-slate-300 hover:text-emerald-300 transition">
                    <Pencil size={13} /> Edit
                  </button>
                  <button onClick={() => setConfirmDelete(field._id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/5 hover:bg-red-600/20 text-sm text-slate-300 hover:text-red-400 transition">
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </motion.div>
            ))}

            {/* Empty State */}
            {filtered.length === 0 && !loading && (
              <div className="col-span-full py-16 text-center">
                <Layers size={48} className="mx-auto text-slate-700 mb-4" />
                <p className="text-slate-500 mb-2">{search || filterStatus !== "all" ? "No fields match your filter" : "No fields added yet"}</p>
                <button onClick={() => { resetForm(); setShowForm(true); }} className="text-emerald-400 text-sm hover:underline">+ Add your first field</button>
              </div>
            )}
          </motion.div>
        )}

        {/* ─── Delete Confirmation Modal ─── */}
        <AnimatePresence>
          {confirmDelete && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setConfirmDelete(null)}>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center"><AlertTriangle size={20} className="text-red-400" /></div>
                  <h3 className="text-lg font-semibold">Delete Field?</h3>
                </div>
                <p className="text-sm text-slate-400 mb-6">This will permanently remove this field and its data. This action cannot be undone.</p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition">Cancel</button>
                  <button onClick={() => handleDelete(confirmDelete)} disabled={deleting === confirmDelete} className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-sm font-medium transition disabled:opacity-50">
                    {deleting === confirmDelete ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Delete"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Add/Edit Form Modal ─── */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={resetForm}>
              <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    {editingId ? <Pencil size={18} className="text-emerald-400" /> : <Plus size={18} className="text-emerald-400" />}
                    {editingId ? "Edit Field" : "Add New Field"}
                  </h3>
                  <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-white/10 transition"><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Field Name */}
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Field Name *</label>
                    <input value={form.fieldName} onChange={(e) => setForm({ ...form, fieldName: e.target.value })} placeholder="e.g. North Plot, Field A" className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm outline-none focus:border-emerald-500/50 transition" required />
                  </div>

                  {/* Crop & Size */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Crop</label>
                      <select value={form.cropType} onChange={(e) => setForm({ ...form, cropType: e.target.value })} className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm outline-none focus:border-emerald-500/50 transition appearance-none">
                        <option value="">Select Crop</option>
                        {CROP_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Size</label>
                      <div className="flex gap-2">
                        <input type="number" value={form.fieldSize} onChange={(e) => setForm({ ...form, fieldSize: e.target.value })} placeholder="0" min="0" className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm outline-none focus:border-emerald-500/50 transition" />
                        <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="px-2 py-2.5 rounded-lg bg-white/5 border border-white/10 text-xs outline-none">
                          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Soil & Water */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Soil Type</label>
                      <select value={form.soilType} onChange={(e) => setForm({ ...form, soilType: e.target.value })} className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm outline-none focus:border-emerald-500/50 transition capitalize appearance-none">
                        {SOIL_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Water Source</label>
                      <select value={form.waterSource} onChange={(e) => setForm({ ...form, waterSource: e.target.value })} className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm outline-none focus:border-emerald-500/50 transition capitalize appearance-none">
                        {WATER_SOURCES.map((w) => <option key={w} value={w}>{w}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Season & Sowing Date */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Season</label>
                      <select value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })} className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm outline-none focus:border-emerald-500/50 transition capitalize appearance-none">
                        {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Sowing Date</label>
                      <input type="date" value={form.sowingDate} onChange={(e) => setForm({ ...form, sowingDate: e.target.value })} className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm outline-none focus:border-emerald-500/50 transition" />
                    </div>
                  </div>

                  {/* Location */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">City</label>
                      <input value={form.location.city} onChange={(e) => setForm({ ...form, location: { ...form.location, city: e.target.value } })} placeholder={user?.city || "City"} className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm outline-none focus:border-emerald-500/50 transition" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">State</label>
                      <input value={form.location.state} onChange={(e) => setForm({ ...form, location: { ...form.location, state: e.target.value } })} placeholder={user?.state || "State"} className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm outline-none focus:border-emerald-500/50 transition" />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Notes</label>
                    <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Any additional notes..." className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm outline-none focus:border-emerald-500/50 transition resize-none" />
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={resetForm} className="flex-1 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition">Cancel</button>
                    <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2">
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                      {editingId ? "Update" : "Add Field"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default FarmManager;
