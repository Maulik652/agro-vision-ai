import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, Star, CheckCircle, UserX, Unlock, ShieldOff, Trash2 } from "lucide-react";
import { fetchAdminExperts, fetchExpertPayouts, releaseExpertPayout, updateUserStatus, deleteAdminUser } from "../../api/adminApi";
import toast from "react-hot-toast";

export default function ExpertsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("experts");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-experts", { search, page }],
    queryFn: () => fetchAdminExperts({ search, page, limit: 20 }),
  });

  const { data: payouts = [], isLoading: payoutsLoading } = useQuery({
    queryKey: ["admin-expert-payouts"],
    queryFn: fetchExpertPayouts,
    enabled: tab === "payouts",
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => updateUserStatus(id, status),
    onSuccess: () => { qc.invalidateQueries(["admin-experts"]); toast.success("Updated"); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteAdminUser(id),
    onSuccess: () => { qc.invalidateQueries(["admin-experts"]); toast.success("Expert removed"); setConfirmDelete(null); },
    onError: () => toast.error("Failed to delete"),
  });

  const releaseMut = useMutation({
    mutationFn: (id) => releaseExpertPayout(id),
    onSuccess: () => { qc.invalidateQueries(["admin-expert-payouts"]); toast.success("Escrow released"); },
    onError: () => toast.error("Failed"),
  });

  const experts = data?.data || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
          Expert Management
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage experts, earnings, and escrow payouts</p>
      </div>

      <div className="flex gap-2">
        {["experts", "payouts"].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition ${
              tab === t ? "bg-green-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}>
            {t === "payouts" ? "Escrow Payouts" : "All Experts"}
          </button>
        ))}
      </div>

      {tab === "experts" && (
        <>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white max-w-sm">
            <Search size={14} className="text-slate-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search experts..." className="flex-1 text-sm outline-none text-slate-700 placeholder:text-slate-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-44 rounded-2xl bg-slate-100 animate-pulse" />)
              : experts.map((e, i) => (
                  <motion.div key={e._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 hover:shadow-md transition">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-violet-600 flex items-center justify-center text-white font-bold">
                          {e.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{e.name}</p>
                          <p className="text-xs text-slate-400">{e.qualification || "Expert"}</p>
                        </div>
                      </div>
                      <Star size={14} className="text-amber-400" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center p-2 rounded-lg bg-slate-50">
                        <p className="text-sm font-bold text-slate-800">{e.consultCount || 0}</p>
                        <p className="text-[10px] text-slate-400">Consults</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-slate-50">
                        <p className="text-sm font-bold text-slate-800">{e.completedCount || 0}</p>
                        <p className="text-[10px] text-slate-400">Completed</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-emerald-50">
                        <p className="text-sm font-bold text-emerald-700">₹{(e.totalEarnings || 0).toLocaleString("en-IN")}</p>
                        <p className="text-[10px] text-emerald-600">Earned</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">{e.email}</p>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => statusMut.mutate({ id: e._id, status: "active" })}
                        disabled={e.status === "active"}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition disabled:opacity-30">
                        <CheckCircle size={11} /> Activate
                      </button>
                      <button onClick={() => statusMut.mutate({ id: e._id, status: "suspended" })}
                        disabled={e.status === "suspended"}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100 transition disabled:opacity-30">
                        <UserX size={11} /> Suspend
                      </button>
                      <button onClick={() => statusMut.mutate({ id: e._id, status: "blocked" })}
                        disabled={e.status === "blocked"}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-50 text-orange-700 text-xs font-medium hover:bg-orange-100 transition disabled:opacity-30">
                        <ShieldOff size={11} /> Block
                      </button>
                      <button onClick={() => setConfirmDelete(e)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition">
                        <Trash2 size={11} /> Delete
                      </button>
                    </div>
                  </motion.div>
                ))}
          </div>

          {pages > 1 && (
            <div className="flex items-center gap-2 justify-center">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-4 py-2 text-sm rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Prev</button>
              <span className="text-sm text-slate-500">Page {page} of {pages}</span>
              <button disabled={page === pages} onClick={() => setPage((p) => p + 1)} className="px-4 py-2 text-sm rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Next</button>
            </div>
          )}
        </>
      )}

      {tab === "payouts" && (
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
              Pending Escrow Releases
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">{payouts.length} pending</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {["Order ID", "Farmer", "Buyer", "Amount", "Completed", "Action"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {payoutsLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                      ))}</tr>
                    ))
                  : payouts.map((o) => (
                      <tr key={o._id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{o.orderId || o._id?.toString().slice(-8)}</td>
                        <td className="px-4 py-3 text-slate-700">{o.farmer?.name || "—"}</td>
                        <td className="px-4 py-3 text-slate-500">{o.buyer?.name || "—"}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-700">₹{(o.totalAmount || 0).toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{o.updatedAt ? new Date(o.updatedAt).toLocaleDateString() : "—"}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => releaseMut.mutate(o._id)}
                            disabled={releaseMut.isPending}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition disabled:opacity-50">
                            <Unlock size={11} /> Release
                          </button>
                        </td>
                      </tr>
                    ))}
                {!payoutsLoading && payouts.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">No pending escrow releases</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
              <Trash2 size={20} className="text-red-600" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-1" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
              Delete Expert?
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