import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, UserCheck, UserX, ShieldOff, Trash2, TrendingUp, Sprout } from "lucide-react";
import { fetchAdminUsers, updateUserStatus, deleteAdminUser } from "../../api/adminApi";
import toast from "react-hot-toast";

const STATUS_BADGE = {
  active:    "bg-green-100 text-green-700",
  suspended: "bg-amber-100 text-amber-700",
  blocked:   "bg-red-100 text-red-700",
};

export default function FarmersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-farmers", { search, filterStatus, page }],
    queryFn: () => fetchAdminUsers({ role: "farmer", search, status: filterStatus, page, limit: 18 }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-farmers"] });

  const statusMut = useMutation({
    mutationFn: ({ id, s }) => updateUserStatus(id, s),
    onSuccess: () => { invalidate(); toast.success("Status updated"); },
    onError: () => toast.error("Failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteAdminUser(id),
    onSuccess: () => { invalidate(); toast.success("Farmer removed"); setConfirmDelete(null); },
    onError: () => toast.error("Failed to delete"),
  });

  const farmers = data?.data || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
          Farmer Intelligence Panel
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">{total} registered farmers</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white flex-1 min-w-48">
          <Search size={14} className="text-slate-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search farmers by name or email..."
            className="flex-1 text-sm outline-none text-slate-700 placeholder:text-slate-400" />
        </div>
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-52 rounded-2xl bg-slate-100 animate-pulse" />
            ))
          : farmers.length === 0
          ? (
              <div className="col-span-3 py-16 text-center text-slate-400 text-sm">
                No farmers found
              </div>
            )
          : farmers.map((f, i) => (
              <motion.div key={f._id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                className={`rounded-2xl bg-white border border-slate-100 shadow-sm p-5 hover:shadow-md transition ${f.isDeleted ? "opacity-50" : ""}`}>

                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {f.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{f.name}</p>
                      <p className="text-xs text-slate-400">{f.city}, {f.state}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_BADGE[f.status] || STATUS_BADGE.active}`}>
                    {f.status || "active"}
                  </span>
                </div>

                {/* Info */}
                <div className="space-y-1 mb-4">
                  <p className="text-xs text-slate-500 truncate">{f.email}</p>
                  {f.phone && <p className="text-xs text-slate-400">📞 {f.phone}</p>}
                  <div className="flex gap-3 mt-1">
                    {f.crops && (
                      <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-lg">
                        <Sprout size={10} /> {f.crops}
                      </span>
                    )}
                    {f.farmSize && (
                      <span className="flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg">
                        <TrendingUp size={10} /> {f.farmSize} acres
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => statusMut.mutate({ id: f._id, s: "active" })}
                    disabled={f.status === "active" || statusMut.isPending}
                    title="Activate"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition disabled:opacity-30">
                    <UserCheck size={11} /> Activate
                  </button>
                  <button
                    onClick={() => statusMut.mutate({ id: f._id, s: "suspended" })}
                    disabled={f.status === "suspended" || statusMut.isPending}
                    title="Suspend"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100 transition disabled:opacity-30">
                    <UserX size={11} /> Suspend
                  </button>
                  <button
                    onClick={() => statusMut.mutate({ id: f._id, s: "blocked" })}
                    disabled={f.status === "blocked" || statusMut.isPending}
                    title="Block"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-50 text-orange-700 text-xs font-medium hover:bg-orange-100 transition disabled:opacity-30">
                    <ShieldOff size={11} /> Block
                  </button>
                  <button
                    onClick={() => setConfirmDelete(f)}
                    title="Delete"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition">
                    <Trash2 size={11} /> Delete
                  </button>
                </div>
              </motion.div>
            ))}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center gap-2 justify-center">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 text-sm rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Prev</button>
          <span className="text-sm text-slate-500">Page {page} of {pages}</span>
          <button disabled={page === pages} onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 text-sm rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Next</button>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
              <Trash2 size={20} className="text-red-600" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-1" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
              Delete Farmer?
            </h3>
            <p className="text-sm text-slate-500 mb-5">
              This will <span className="font-semibold text-red-600">permanently delete</span> <span className="font-semibold text-slate-700">{confirmDelete.name}</span> from the database. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                Cancel
              </button>
              <button onClick={() => deleteMut.mutate(confirmDelete._id)}
                disabled={deleteMut.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition disabled:opacity-60">
                {deleteMut.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
