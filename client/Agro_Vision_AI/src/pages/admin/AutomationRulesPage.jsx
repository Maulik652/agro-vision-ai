import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Plus, Trash2, ToggleLeft, ToggleRight, X } from "lucide-react";
import { fetchAutomationRules, createAutomationRule, updateAutomationRule, deleteAutomationRule } from "../../api/adminApi";
import toast from "react-hot-toast";

const PRESETS = [
  { name: "Auto-block spam users", condition: "failedLoginAttempts >= 5", action: "block_user" },
  { name: "Notify low-price crop", condition: "cropPrice < marketPrice * 0.8", action: "notify_farmer" },
  { name: "Flag high-value order", condition: "orderAmount > 100000", action: "flag_for_review" },
];

export default function AutomationRulesPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", condition: "", action: "" });

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["admin-automation-rules"],
    queryFn: fetchAutomationRules,
  });

  const createMut = useMutation({
    mutationFn: createAutomationRule,
    onSuccess: () => { qc.invalidateQueries(["admin-automation-rules"]); toast.success("Rule created"); setShowModal(false); setForm({ name: "", condition: "", action: "" }); },
    onError: () => toast.error("Failed"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateAutomationRule(id, data),
    onSuccess: () => { qc.invalidateQueries(["admin-automation-rules"]); toast.success("Rule updated"); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteAutomationRule,
    onSuccess: () => { qc.invalidateQueries(["admin-automation-rules"]); toast.success("Rule deleted"); },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
            Automation Rule Engine
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Create IF-THEN rules to automate platform actions</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition"
        >
          <Plus size={14} /> New Rule
        </button>
      </div>

      {/* Presets */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Quick Presets</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PRESETS.map((p, i) => (
            <button
              key={i}
              onClick={() => { setForm(p); setShowModal(true); }}
              className="text-left p-4 rounded-xl border border-dashed border-slate-300 hover:border-green-400 hover:bg-green-50/50 transition"
            >
              <p className="font-medium text-slate-700 text-sm">{p.name}</p>
              <p className="text-xs text-slate-400 mt-1 font-mono">IF {p.condition}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
            ))
          : rules.map((rule, i) => (
              <motion.div
                key={rule._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm"
              >
                <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                  <Zap size={16} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{rule.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    IF {rule.condition} → {rule.action}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Triggered {rule.triggerCount} times</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => updateMut.mutate({ id: rule._id, data: { isActive: !rule.isActive } })}
                    className={`transition ${rule.isActive ? "text-green-600" : "text-slate-400"}`}
                  >
                    {rule.isActive ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                  </button>
                  <button
                    onClick={() => deleteMut.mutate(rule._id)}
                    className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </motion.div>
            ))}
        {!isLoading && rules.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">
            <Zap size={32} className="mx-auto mb-2 opacity-30" />
            No automation rules yet. Create your first rule.
          </div>
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-slate-800" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
                  Create Automation Rule
                </h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Rule Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Auto-block spam users"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-green-400/40"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Condition (IF)</label>
                  <input
                    value={form.condition}
                    onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}
                    placeholder="e.g. failedLoginAttempts >= 5"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-green-400/40 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Action (THEN)</label>
                  <input
                    value={form.action}
                    onChange={(e) => setForm((f) => ({ ...f, action: e.target.value }))}
                    placeholder="e.g. block_user"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-green-400/40 font-mono"
                  />
                </div>
                <button
                  onClick={() => createMut.mutate(form)}
                  disabled={!form.name || !form.condition || !form.action || createMut.isPending}
                  className="w-full py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50"
                >
                  {createMut.isPending ? "Creating..." : "Create Rule"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
