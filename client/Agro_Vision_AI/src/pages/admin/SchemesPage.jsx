import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, X, FileText } from "lucide-react";
import { fetchAdminSchemes, createAdminScheme, updateAdminScheme, deleteAdminScheme } from "../../api/adminApi";
import toast from "react-hot-toast";

const STATUS_BADGE = {
  active:   "bg-green-100 text-green-700",
  expired:  "bg-red-100 text-red-700",
  upcoming: "bg-blue-100 text-blue-700",
};

const EMPTY_FORM = { name: "", description: "", ministry: "", category: "subsidy", status: "active", benefits: "", applicationUrl: "" };

export default function SchemesPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-schemes", { status, page }],
    queryFn: () => fetchAdminSchemes({ status, page, limit: 20 }),
  });

  const createMut = useMutation({
    mutationFn: createAdminScheme,
    onSuccess: () => { qc.invalidateQueries(["admin-schemes"]); toast.success("Scheme created"); closeModal(); },
    onError: () => toast.error("Failed"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data: d }) => updateAdminScheme(id, d),
    onSuccess: () => { qc.invalidateQueries(["admin-schemes"]); toast.success("Scheme updated"); closeModal(); },
    onError: () => toast.error("Failed"),
  });

  const deleteMut = useMutation({
    mutationFn: deleteAdminScheme,
    onSuccess: () => { qc.invalidateQueries(["admin-schemes"]); toast.success("Deleted"); },
    onError: () => toast.error("Failed"),
  });

  const openCreate = () => { setEditItem(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (s) => { setEditItem(s); setForm({ name: s.name, description: s.description, ministry: s.ministry || "", category: s.category, status: s.status, benefits: s.benefits || "", applicationUrl: s.applicationUrl || "" }); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditItem(null); setForm(EMPTY_FORM); };
  const handleSubmit = () => editItem ? updateMut.mutate({ id: editItem._id, data: form }) : createMut.mutate(form);

  const schemes = data?.data || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
            Government Schemes
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} schemes available to farmers</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition">
          <Plus size={14} /> Add Scheme
        </button>
      </div>

      <div className="flex gap-2">
        {["", "active", "upcoming", "expired"].map((s) => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition ${
              status === s ? "bg-green-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}>
            {s || "All"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 animate-pulse" />)
          : schemes.map((s, i) => (
              <motion.div key={s._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <FileText size={15} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{s.name}</p>
                      <p className="text-xs text-slate-400">{s.ministry || "Government of India"}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_BADGE[s.status] || "bg-slate-100 text-slate-600"}`}>
                    {s.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 mb-3">{s.description}</p>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium capitalize">{s.category}</span>
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => deleteMut.mutate(s._id)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
        {!isLoading && schemes.length === 0 && (
          <div className="col-span-2 text-center py-12 text-slate-400 text-sm">No schemes found</div>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center gap-2 justify-center">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-4 py-2 text-sm rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Prev</button>
          <span className="text-sm text-slate-500">Page {page} of {pages}</span>
          <button disabled={page === pages} onClick={() => setPage((p) => p + 1)} className="px-4 py-2 text-sm rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Next</button>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeModal}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.2 }}
              className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-slate-800" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
                  {editItem ? "Edit Scheme" : "Add Government Scheme"}
                </h3>
                <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                {[
                  { key: "name", label: "Scheme Name", type: "text" },
                  { key: "ministry", label: "Ministry", type: "text" },
                  { key: "applicationUrl", label: "Application URL", type: "url" },
                ].map(({ key, label, type }) => (
                  <div key={key}>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">{label}</label>
                    <input type={type} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-green-400/40" />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Category</label>
                    <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none">
                      {["subsidy","insurance","loan","training","infrastructure","market","irrigation","organic","other"].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Status</label>
                    <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none">
                      <option value="active">Active</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-green-400/40 resize-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Benefits</label>
                  <textarea value={form.benefits} onChange={(e) => setForm((f) => ({ ...f, benefits: e.target.value }))} rows={2}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-green-400/40 resize-none" />
                </div>
                <button onClick={handleSubmit}
                  disabled={!form.name || !form.description || createMut.isPending || updateMut.isPending}
                  className="w-full py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50">
                  {createMut.isPending || updateMut.isPending ? "Saving..." : editItem ? "Update Scheme" : "Create Scheme"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
