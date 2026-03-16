import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";

const FIELDS = [
  { name: "fullName",   label: "Full Name",    placeholder: "Your full name",   half: false },
  { name: "phone",      label: "Phone",        placeholder: "+91 9876543210",   half: true  },
  { name: "postalCode", label: "Postal Code",  placeholder: "400001",           half: true  },
  { name: "street",     label: "Street",       placeholder: "House no, Street", half: false },
  { name: "city",       label: "City",         placeholder: "Mumbai",           half: true  },
  { name: "state",      label: "State",        placeholder: "Maharashtra",      half: true  },
];

const EMPTY = { fullName: "", phone: "", street: "", city: "", state: "", postalCode: "", isDefault: false };

export default function AddAddressModal({ open, onClose, onSave, saving, initial }) {
  const [form, setForm] = useState(initial ?? EMPTY);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-slate-800 font-semibold text-base">
                {initial ? "Edit Address" : "Add New Address"}
              </h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {FIELDS.map((f) => (
                  <div key={f.name} className={f.half ? "" : "col-span-2"}>
                    <label className="text-slate-500 text-xs font-medium block mb-1">{f.label}</label>
                    <input
                      required
                      value={form[f.name]}
                      onChange={(e) => set(f.name, e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 text-sm focus:outline-none focus:border-green-500 placeholder-slate-400"
                    />
                  </div>
                ))}
              </div>

              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => set("isDefault", e.target.checked)}
                  className="accent-green-600 w-4 h-4"
                />
                <span className="text-slate-600 text-sm">Set as default address</span>
              </label>

              <button
                type="submit"
                disabled={saving}
                className="w-full mt-2 py-3 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {initial ? "Save Changes" : "Add Address"}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
