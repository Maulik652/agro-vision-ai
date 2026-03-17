import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, UserCheck, UserX, ShieldOff, Trash2 } from "lucide-react";
import { fetchAdminUsers, updateUserStatus, updateUserRole, deleteAdminUser } from "../../api/adminApi";
import toast from "react-hot-toast";

const STATUS_BADGE = {
  active: "bg-green-100 text-green-700",
  suspended: "bg-amber-100 text-amber-700",
  blocked: "bg-red-100 text-red-700",
};

export default function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", { search, role, filterStatus, page }],
    queryFn: () => fetchAdminUsers({ search, role, status: filterStatus, page, limit: 20 }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-users"] });

  const statusMut = useMutation({
    mutationFn: ({ id, s }) => updateUserStatus(id, s),
    onSuccess: () => { invalidate(); toast.success("Status updated"); },
    onError: () => toast.error("Failed to update status"),
  });

  const roleMut = useMutation({
    mutationFn: ({ id, r }) => updateUserRole(id, r),
    onSuccess: () => { invalidate(); toast.success("Role updated"); },
    onError: () => toast.error("Failed to update role"),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteAdminUser(id),
    onSuccess: () => { invalidate(); toast.success("User removed"); setConfirmDelete(null); },
    onError: () => toast.error("Failed to delete user"),
  });

  const users = data?.data || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
          User Control Center
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">{total} total users</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white flex-1 min-w-48">
          <Search size={14} className="text-slate-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or email..."
            className="flex-1 text-sm outline-none text-slate-700 placeholder:text-slate-400" />
        </div>
        <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none">
          <option value="">All Roles</option>
          <option value="farmer">Farmer</option>
          <option value="buyer">Buyer</option>
          <option value="expert">Expert</option>
          <option value="admin">Admin</option>
        </select>
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {["User", "Email", "Role", "Status", "City", "Joined", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                    ))}</tr>
                  ))
                : users.map((u) => (
                    <motion.tr key={u._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className={`hover:bg-slate-50 transition ${u.isDeleted ? "opacity-40" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {u.name?.[0]?.toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-800">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{u.email}</td>
                      <td className="px-4 py-3">
                        <select value={u.role}
                          onChange={(e) => roleMut.mutate({ id: u._id, r: e.target.value })}
                          disabled={u.role === "admin"}
                          className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-white outline-none disabled:opacity-50">
                          <option value="farmer">Farmer</option>
                          <option value="buyer">Buyer</option>
                          <option value="expert">Expert</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_BADGE[u.status] || STATUS_BADGE.active}`}>
                          {u.status || "active"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{u.city}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => statusMut.mutate({ id: u._id, s: "active" })}
                            disabled={u.status === "active" || u.role === "admin"}
                            title="Activate"
                            className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition disabled:opacity-30">
                            <UserCheck size={13} />
                          </button>
                          <button onClick={() => statusMut.mutate({ id: u._id, s: "suspended" })}
                            disabled={u.status === "suspended" || u.role === "admin"}
                            title="Suspend"
                            className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition disabled:opacity-30">
                            <UserX size={13} />
                          </button>
                          <button onClick={() => statusMut.mutate({ id: u._id, s: "blocked" })}
                            disabled={u.status === "blocked" || u.role === "admin"}
                            title="Block"
                            className="p-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition disabled:opacity-30">
                            <ShieldOff size={13} />
                          </button>
                          <button onClick={() => setConfirmDelete(u)}
                            disabled={u.role === "admin"}
                            title="Delete"
                            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-30">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-400">Page {page} of {pages} — {total} users</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Prev</button>
              <button disabled={page === pages} onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Next</button>
            </div>
          </div>
        )}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
              <Trash2 size={20} className="text-red-600" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-1" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
              Delete User?
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
