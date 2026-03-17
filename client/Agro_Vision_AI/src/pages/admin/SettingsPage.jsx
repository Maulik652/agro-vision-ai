import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Settings, Save, ToggleLeft, ToggleRight } from "lucide-react";
import { fetchSettings, updateSettings } from "../../api/adminApi";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-settings"], queryFn: fetchSettings });

  const [form, setForm] = useState({
    commissionPercent: 5,
    platformFee: 2,
    autoApproveListings: false,
    maintenanceMode: false,
    maxOrderValue: 500000,
    fraudThreshold: 3,
    aiEnabled: true,
    razorpayEnabled: true,
    stripeEnabled: false,
    supportEmail: "support@agrovision.ai",
    reportSchedule: "weekly",
  });

  useEffect(() => {
    if (data) setForm((f) => ({ ...f, ...data }));
  }, [data]);

  const saveMut = useMutation({
    mutationFn: () => updateSettings(form),
    onSuccess: () => { qc.invalidateQueries(["admin-settings"]); toast.success("Settings saved"); },
    onError: () => toast.error("Failed to save"),
  });

  const toggle = (key) => setForm((f) => ({ ...f, [key]: !f[key] }));

  const TOGGLES = [
    { key: "autoApproveListings", label: "Auto-approve Listings", desc: "Automatically approve new crop listings" },
    { key: "maintenanceMode", label: "Maintenance Mode", desc: "Put platform in maintenance mode" },
    { key: "aiEnabled", label: "AI Features", desc: "Enable all AI-powered features" },
    { key: "razorpayEnabled", label: "Razorpay", desc: "Enable Razorpay payment gateway" },
    { key: "stripeEnabled", label: "Stripe", desc: "Enable Stripe payment gateway" },
  ];

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
          Platform Settings
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Configure platform-wide settings and feature toggles</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Numeric Settings */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 space-y-4"
          >
            <h3 className="font-bold text-slate-800 text-sm" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
              Financial Settings
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: "commissionPercent", label: "Commission %", min: 0, max: 30 },
                { key: "platformFee", label: "Platform Fee %", min: 0, max: 10 },
                { key: "maxOrderValue", label: "Max Order Value (₹)", min: 1000, max: 10000000 },
                { key: "fraudThreshold", label: "Fraud Threshold (attempts)", min: 1, max: 20 },
              ].map(({ key, label, min, max }) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">{label}</label>
                  <input
                    type="number"
                    min={min}
                    max={max}
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-green-400/40"
                  />
                </div>
              ))}
            </div>
          </motion.div>

          {/* Text Settings */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 space-y-4"
          >
            <h3 className="font-bold text-slate-800 text-sm" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
              General Settings
            </h3>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Support Email</label>
              <input
                type="email"
                value={form.supportEmail}
                onChange={(e) => setForm((f) => ({ ...f, supportEmail: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-green-400/40"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Report Schedule</label>
              <select
                value={form.reportSchedule}
                onChange={(e) => setForm((f) => ({ ...f, reportSchedule: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </motion.div>

          {/* Toggles */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 space-y-1"
          >
            <h3 className="font-bold text-slate-800 text-sm mb-4" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
              Feature Toggles
            </h3>
            {TOGGLES.map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-800">{label}</p>
                  <p className="text-xs text-slate-400">{desc}</p>
                </div>
                <button onClick={() => toggle(key)} className={`transition ${form[key] ? "text-green-600" : "text-slate-300"}`}>
                  {form[key] ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                </button>
              </div>
            ))}
          </motion.div>

          <button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50"
          >
            <Save size={14} />
            {saveMut.isPending ? "Saving..." : "Save Settings"}
          </button>
        </>
      )}
    </div>
  );
}
