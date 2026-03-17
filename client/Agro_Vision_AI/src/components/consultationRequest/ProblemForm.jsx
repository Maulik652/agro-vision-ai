import { motion } from "framer-motion";
import { Leaf, AlertCircle } from "lucide-react";

const CROPS = ["Wheat","Rice","Maize","Cotton","Sugarcane","Soybean","Tomato","Potato","Onion","Mango","Banana","Other"];
const CATEGORIES = [
  { value: "disease",    label: "Crop Disease" },
  { value: "pest",       label: "Pest Infestation" },
  { value: "nutrition",  label: "Nutrient Deficiency" },
  { value: "irrigation", label: "Irrigation Issue" },
  { value: "market",     label: "Market Guidance" },
  { value: "weather",    label: "Weather Impact" },
  { value: "general",    label: "General Query" },
];

const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-all";

export default function ProblemForm({ form, onChange }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-5"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
          <Leaf size={18} className="text-green-400" />
        </div>
        <div>
          <h2 className="text-slate-900 font-semibold text-lg">Describe Your Problem</h2>
          <p className="text-slate-500 text-xs">Tell us what's happening with your crop</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-slate-600 text-sm mb-1.5 block">Crop Type *</label>
          <select
            value={form.cropType}
            onChange={e => onChange("cropType", e.target.value)}
            className={inputCls}
          >
            <option value="" >Select crop...</option>
            {CROPS.map(c => <option key={c} value={c} >{c}</option>)}
          </select>
        </div>

        <div>
          <label className="text-slate-600 text-sm mb-1.5 block">Problem Category *</label>
          <select
            value={form.problemCategory}
            onChange={e => onChange("problemCategory", e.target.value)}
            className={inputCls}
          >
            <option value="" >Select category...</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value} >{c.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="text-slate-600 text-sm mb-1.5 block">Problem Description *</label>
        <textarea
          rows={4}
          value={form.description}
          onChange={e => onChange("description", e.target.value)}
          placeholder="Describe the symptoms, when it started, affected area size..."
          className={`${inputCls} resize-none`}
        />
        <p className="text-slate-400 text-xs mt-1 text-right">{form.description.length}/3000</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-slate-600 text-sm mb-1.5 block">City</label>
          <input
            type="text"
            value={form.city}
            onChange={e => onChange("city", e.target.value)}
            placeholder="Your city"
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-slate-600 text-sm mb-1.5 block">State</label>
          <input
            type="text"
            value={form.state}
            onChange={e => onChange("state", e.target.value)}
            placeholder="Your state"
            className={inputCls}
          />
        </div>
      </div>

      {(!form.cropType || !form.problemCategory || !form.description) && (
        <div className="flex items-center gap-2 text-amber-600 text-xs">
          <AlertCircle size={13} />
          <span>Crop type, category and description are required</span>
        </div>
      )}
    </motion.div>
  );
}
