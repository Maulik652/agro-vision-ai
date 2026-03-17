import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BookOpen, Eye, Trash2, CheckCircle, Archive } from "lucide-react";
import { fetchAdminAdvisories, updateAdvisoryStatus, deleteAdvisoryAdmin } from "../../api/adminApi";
import toast from "react-hot-toast";

const STATUS_BADGE = {
  draft:     "bg-slate-100 text-slate-600",
  scheduled: "bg-blue-100 text-blue-700",
  published: "bg-green-100 text-green-700",
  active:    "bg-emerald-100 text-emerald-700",
  expired:   "bg-amber-100 text-amber-700",
  archived:  "bg-slate-100 text-slate-500",
};

const CATEGORY_COLOR = {
  crop: "bg-green-50 text-green-700",
  market: "bg-blue-50 text-blue-700",
  disease: "bg-red-50 text-red-700",
  weather: "bg-sky-50 text-sky-700",
  pest: "bg-orange-50 text-orange-700",
  irrigation: "bg-cyan-50 text-cyan-700",
  general: "bg-slate-50 text-slate-600",
};

export default function AdvisoriesPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-advisories", { status, category, page }],
    queryFn: () => fetchAdminAdvisories({ status, category, page, limit: 20 }),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status: s }) => updateAdvisoryStatus(id, s),
    onSuccess: () => { qc.invalidateQueries(["admin-advisories"]); toast.success("Advisory updated"); },
    onError: () => toast.error("Failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteAdvisoryAdmin(id),
    onSuccess: () => { qc.invalidateQueries(["admin-advisories"]); toast.success("Deleted"); },
    onError: () => toast.error("Failed"),
  });

  const advisories = data?.data || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
          Advisory Management
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">{total} total advisories from all experts</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none">
          <option value="">All Status</option>
          {["draft","scheduled","published","active","expired","archived"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none">
          <option value="">All Categories</option>
          {["crop","market","disease","weather","pest","irrigation","general"].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />)
          : advisories.map((a, i) => (
              <motion.div key={a._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 hover:shadow-md transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                      <BookOpen size={15} className="text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-slate-800 text-sm truncate">{a.title}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_BADGE[a.status] || "bg-slate-100 text-slate-600"}`}>
                          {a.status}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${CATEGORY_COLOR[a.category] || "bg-slate-50 text-slate-600"}`}>
                          {a.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1">{a.summary || a.content?.slice(0, 100)}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                        <span>By {a.createdBy?.name || "—"}</span>
                        <span className="flex items-center gap-1"><Eye size={10} /> {a.views || 0} views</span>
                        <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => statusMut.mutate({ id: a._id, status: "published" })}
                      className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition" title="Publish">
                      <CheckCircle size={13} />
                    </button>
                    <button onClick={() => statusMut.mutate({ id: a._id, status: "archived" })}
                      className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition" title="Archive">
                      <Archive size={13} />
                    </button>
                    <button onClick={() => deleteMut.mutate(a._id)}
                      className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition" title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
        {!isLoading && advisories.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">No advisories found</div>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center gap-2 justify-center">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-4 py-2 text-sm rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Prev</button>
          <span className="text-sm text-slate-500">Page {page} of {pages}</span>
          <button disabled={page === pages} onClick={() => setPage((p) => p + 1)} className="px-4 py-2 text-sm rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Next</button>
        </div>
      )}
    </div>
  );
}
