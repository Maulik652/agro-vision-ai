import React, { useState, useEffect, useCallback, useMemo } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, Plus, Trash2, TrendingUp, TrendingDown, DollarSign,
  BarChart3, PieChart, ArrowUpRight, ArrowDownRight, Loader2,
  X, Check, Filter, Calendar, RefreshCw, Download, AlertTriangle,
  Wheat, Droplets, Bug, Fuel, Users, Wrench, Truck, Package, Shield
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getExpenses, addExpense, deleteExpense, getExpenseSummary } from "../../api/farmerApi";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RPieChart, Pie, Cell } from "recharts";
import toast from "react-hot-toast";

/* ─── Constants ─── */
const EXPENSE_CATEGORIES = [
  { key: "seeds", label: "Seeds", icon: Wheat, color: "#10b981" },
  { key: "fertilizer", label: "Fertilizer", icon: Droplets, color: "#3b82f6" },
  { key: "pesticide", label: "Pesticide", icon: Bug, color: "#ef4444" },
  { key: "labor", label: "Labor", icon: Users, color: "#f59e0b" },
  { key: "fuel", label: "Fuel", icon: Fuel, color: "#8b5cf6" },
  { key: "equipment", label: "Equipment", icon: Wrench, color: "#06b6d4" },
  { key: "irrigation", label: "Irrigation", icon: Droplets, color: "#0ea5e9" },
  { key: "transport", label: "Transport", icon: Truck, color: "#f97316" },
  { key: "packaging", label: "Packaging", icon: Package, color: "#84cc16" },
  { key: "rent", label: "Rent", icon: DollarSign, color: "#ec4899" },
  { key: "insurance", label: "Insurance", icon: Shield, color: "#6366f1" },
  { key: "other", label: "Other", icon: Wallet, color: "#64748b" }
];

const CAT_META = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.key, c]));
const PIE_COLORS = EXPENSE_CATEGORIES.map((c) => c.color);

const CROP_OPTIONS = ["Wheat", "Rice", "Tomato", "Cotton", "Maize", "Soybean", "Groundnut", "Sugarcane", "Mustard", "Onion", "Potato", "Chilli"];

const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.05 } } };

const FarmFinance = () => {
  useAuth();
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("overview"); // overview | expenses | income
  const [filterCat, setFilterCat] = useState("all");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const [form, setForm] = useState({
    category: "seeds", type: "expense", amount: "", description: "",
    date: new Date().toISOString().split("T")[0], cropType: "", season: "rabi",
    vendor: "", paymentMode: "cash"
  });

  /* ─── Fetch ─── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [expRes, sumRes] = await Promise.all([
        getExpenses({ limit: 100 }),
        getExpenseSummary()
      ]);
      if (expRes.success) setExpenses(expRes.expenses || []);
      if (sumRes.success) setSummary(sumRes.summary || null);
    } catch {
      toast.error("Failed to load finance data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ─── Add ─── */
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return toast.error("Enter valid amount");
    setSaving(true);
    try {
      const res = await addExpense({ ...form, amount: Number(form.amount) });
      if (res.success) {
        toast.success(`${form.type === "income" ? "Income" : "Expense"} added`);
        setShowForm(false);
        setForm({
          category: "seeds", type: "expense", amount: "", description: "",
          date: new Date().toISOString().split("T")[0], cropType: "", season: "rabi",
          vendor: "", paymentMode: "cash"
        });
        fetchData();
      }
    } catch {
      toast.error("Failed to add entry");
    } finally {
      setSaving(false);
    }
  };

  /* ─── Delete ─── */
  const handleDelete = async (id) => {
    try {
      await deleteExpense(id);
      toast.success("Deleted");
      setConfirmDelete(null);
      setExpenses((prev) => prev.filter((e) => e._id !== id));
      fetchData();
    } catch {
      toast.error("Failed to delete");
    }
  };

  /* ─── Derived Data ─── */
  const filteredExpenses = useMemo(() => {
    let list = expenses;
    if (tab === "expenses") list = list.filter((e) => e.type === "expense");
    if (tab === "income") list = list.filter((e) => e.type === "income");
    if (filterCat !== "all") list = list.filter((e) => e.category === filterCat);
    return list;
  }, [expenses, tab, filterCat]);

  const pieData = useMemo(() => {
    if (!summary?.categoryBreakdown) return [];
    return summary.categoryBreakdown.map((c) => ({
      name: CAT_META[c._id]?.label || c._id,
      value: c.total,
      color: CAT_META[c._id]?.color || "#64748b"
    }));
  }, [summary]);

  const monthlyData = useMemo(() => {
    if (!summary?.monthlyTrend) return [];
    const map = {};
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (const entry of summary.monthlyTrend) {
      const key = `${months[entry._id.month - 1]}`;
      if (!map[key]) map[key] = { month: key, expense: 0, income: 0 };
      if (entry._id.type === "expense") map[key].expense = entry.total;
      if (entry._id.type === "income") map[key].income = entry.total;
    }
    return Object.values(map);
  }, [summary]);

  const profit = summary ? (summary.totalIncome - summary.totalExpense) : 0;
  const profitPct = summary?.profitMargin || 0;

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-emerald-950 to-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ─── Header ─── */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-linear-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Wallet size={24} />
              </div>
              <span className="bg-linear-to-r from-amber-400 to-orange-300 bg-clip-text text-transparent">Farm Finance</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">Track expenses, revenue, and profit for every crop</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchData} className="p-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition"><RefreshCw size={16} /></button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 transition text-sm font-medium shadow-lg shadow-emerald-600/20">
              <Plus size={16} /> Add Entry
            </button>
          </div>
        </motion.div>

        {/* ─── Summary Cards ─── */}
        {summary && (
          <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <motion.div variants={fadeUp} className="p-5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownRight size={16} className="text-red-400" />
                <span className="text-xs text-slate-500">Total Expenses</span>
              </div>
              <p className="text-2xl font-bold text-red-400">₹{(summary.totalExpense || 0).toLocaleString()}</p>
            </motion.div>
            <motion.div variants={fadeUp} className="p-5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpRight size={16} className="text-emerald-400" />
                <span className="text-xs text-slate-500">Total Income</span>
              </div>
              <p className="text-2xl font-bold text-emerald-400">₹{(summary.totalIncome || 0).toLocaleString()}</p>
            </motion.div>
            <motion.div variants={fadeUp} className={`p-5 rounded-xl border backdrop-blur-sm ${profit >= 0 ? "bg-emerald-900/10 border-emerald-500/20" : "bg-red-900/10 border-red-500/20"}`}>
              <div className="flex items-center gap-2 mb-2">
                {profit >= 0 ? <TrendingUp size={16} className="text-emerald-400" /> : <TrendingDown size={16} className="text-red-400" />}
                <span className="text-xs text-slate-500">Net Profit</span>
              </div>
              <p className={`text-2xl font-bold ${profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>₹{Math.abs(profit).toLocaleString()}</p>
            </motion.div>
            <motion.div variants={fadeUp} className="p-5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={16} className="text-blue-400" />
                <span className="text-xs text-slate-500">Profit Margin</span>
              </div>
              <p className={`text-2xl font-bold ${profitPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>{profitPct}%</p>
            </motion.div>
          </motion.div>
        )}

        {/* ─── Charts ─── */}
        {summary && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Monthly Trend */}
            {monthlyData.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">Monthly Income vs Expense</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Income (₹)" />
                    <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expense (₹)" />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* Category Breakdown */}
            {pieData.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">Expense by Category</h3>
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={200}>
                    <RPieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }} formatter={(val) => `₹${val.toLocaleString()}`} />
                    </RPieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-1.5">
                    {pieData.slice(0, 6).map((d) => (
                      <div key={d.name} className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                        <span className="text-slate-400 flex-1">{d.name}</span>
                        <span className="font-medium">₹{d.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ─── Tab Toggle ─── */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
            {["overview", "expenses", "income"].map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-xs font-medium transition capitalize ${tab === t ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>
                {t}
              </button>
            ))}
          </div>
          {tab !== "overview" && (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setFilterCat("all")} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filterCat === "all" ? "bg-emerald-600 text-white" : "bg-white/5 text-slate-400 border border-white/10"}`}>All</button>
              {EXPENSE_CATEGORIES.slice(0, 8).map((c) => (
                <button key={c.key} onClick={() => setFilterCat(c.key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterCat === c.key ? "bg-emerald-600 text-white" : "bg-white/5 text-slate-400 border border-white/10"}`}>
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ─── Loading ─── */}
        {loading && <div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-emerald-500" /></div>}

        {/* ─── Transaction List ─── */}
        {!loading && (
          <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-3">
            {filteredExpenses.map((exp) => {
              const meta = CAT_META[exp.category] || CAT_META.other;
              const IconComp = meta.icon;
              const isIncome = exp.type === "income";
              return (
                <motion.div key={exp._id} variants={fadeUp} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/20 transition group">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${meta.color}20` }}>
                    <IconComp size={18} style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium truncate">{exp.description || meta.label}</h4>
                      {exp.cropType && <span className="text-[10px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">{exp.cropType}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span>{new Date(exp.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                      <span className="capitalize">{exp.category}</span>
                      {exp.vendor && <span>· {exp.vendor}</span>}
                      <span className="capitalize px-1.5 py-0.5 rounded bg-white/5">{exp.paymentMode}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${isIncome ? "text-emerald-400" : "text-red-400"}`}>
                      {isIncome ? "+" : "-"}₹{exp.amount?.toLocaleString()}
                    </p>
                  </div>
                  <button onClick={() => setConfirmDelete(exp._id)} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-600/20 transition">
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </motion.div>
              );
            })}
            {filteredExpenses.length === 0 && (
              <div className="py-16 text-center">
                <Wallet size={48} className="mx-auto text-slate-700 mb-4" />
                <p className="text-slate-500">{tab === "income" ? "No income recorded yet" : tab === "expenses" ? "No expenses recorded yet" : "No transactions yet"}</p>
                <button onClick={() => setShowForm(true)} className="text-emerald-400 text-sm hover:underline mt-2">+ Add your first entry</button>
              </div>
            )}
          </motion.div>
        )}

        {/* ─── Add Form Modal ─── */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2"><Plus size={18} className="text-emerald-400" /> Add Transaction</h3>
                  <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-white/10"><X size={18} /></button>
                </div>

                {/* Type Toggle */}
                <div className="flex gap-2 mb-4">
                  <button onClick={() => setForm({ ...form, type: "expense" })} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${form.type === "expense" ? "bg-red-600/80 text-white" : "bg-white/5 text-slate-400 border border-white/10"}`}>
                    <ArrowDownRight size={14} className="inline mr-1" /> Expense
                  </button>
                  <button onClick={() => setForm({ ...form, type: "income" })} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${form.type === "income" ? "bg-emerald-600 text-white" : "bg-white/5 text-slate-400 border border-white/10"}`}>
                    <ArrowUpRight size={14} className="inline mr-1" /> Income
                  </button>
                </div>

                <form onSubmit={handleAdd} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Amount (₹) *</label>
                      <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" min="0" className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm outline-none focus:border-emerald-500/50" required />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Category</label>
                      <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm outline-none appearance-none">
                        {EXPENSE_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Description</label>
                    <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Bought NPK fertilizer 50kg" className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm outline-none focus:border-emerald-500/50" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Date</label>
                      <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Crop</label>
                      <select value={form.cropType} onChange={(e) => setForm({ ...form, cropType: e.target.value })} className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm outline-none appearance-none">
                        <option value="">Select</option>
                        {CROP_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Vendor</label>
                      <input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="Shop name" className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Payment Mode</label>
                      <select value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value })} className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm outline-none appearance-none">
                        {["cash", "upi", "bank-transfer", "credit", "other"].map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm">Cancel</button>
                    <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Delete Confirm ─── */}
        <AnimatePresence>
          {confirmDelete && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setConfirmDelete(null)}>
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()} className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center"><AlertTriangle size={20} className="text-red-400" /></div>
                  <h3 className="text-lg font-semibold">Delete Entry?</h3>
                </div>
                <p className="text-sm text-slate-400 mb-6">This action cannot be undone.</p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm">Cancel</button>
                  <button onClick={() => handleDelete(confirmDelete)} className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-sm font-medium">Delete</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default FarmFinance;
