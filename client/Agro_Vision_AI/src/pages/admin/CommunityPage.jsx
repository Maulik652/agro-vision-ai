import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { MessageCircle, ThumbsUp, Star, Trash2, Flag, CheckCircle } from "lucide-react";
import { fetchAdminCommunity, updateCommunityPostStatus, deleteCommunityPost } from "../../api/adminApi";
import toast from "react-hot-toast";

const STATUS_BADGE = {
  active:  "bg-green-100 text-green-700",
  closed:  "bg-slate-100 text-slate-600",
  flagged: "bg-red-100 text-red-700",
};

const CATEGORY_COLOR = {
  question:      "bg-blue-50 text-blue-700",
  tip:           "bg-green-50 text-green-700",
  "success-story": "bg-emerald-50 text-emerald-700",
  "market-update": "bg-purple-50 text-purple-700",
  "weather-alert": "bg-sky-50 text-sky-700",
  "pest-warning":  "bg-red-50 text-red-700",
  technique:     "bg-amber-50 text-amber-700",
  general:       "bg-slate-50 text-slate-600",
};

export default function CommunityPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-community", { status, category, page }],
    queryFn: () => fetchAdminCommunity({ status, category, page, limit: 20 }),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, body }) => updateCommunityPostStatus(id, body),
    onSuccess: () => { qc.invalidateQueries(["admin-community"]); toast.success("Post updated"); },
    onError: () => toast.error("Failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteCommunityPost(id),
    onSuccess: () => { qc.invalidateQueries(["admin-community"]); toast.success("Post deleted"); },
    onError: () => toast.error("Failed"),
  });

  const posts = data?.data || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
          Community Moderation
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">{total} total community posts</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="flagged">Flagged</option>
          <option value="closed">Closed</option>
        </select>
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none">
          <option value="">All Categories</option>
          {["question","tip","success-story","market-update","weather-alert","pest-warning","technique","general"].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />)
          : posts.map((p, i) => (
              <motion.div key={p._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className={`rounded-2xl bg-white border shadow-sm p-4 hover:shadow-md transition ${p.status === "flagged" ? "border-red-200" : "border-slate-100"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-slate-800 text-sm truncate">{p.title}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_BADGE[p.status] || "bg-slate-100 text-slate-600"}`}>
                        {p.status}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${CATEGORY_COLOR[p.category] || "bg-slate-50 text-slate-600"}`}>
                        {p.category}
                      </span>
                      {p.isFeatured && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">Featured</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-2">{p.content}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>By {p.author?.name || "—"} ({p.author?.role})</span>
                      <span className="flex items-center gap-1"><ThumbsUp size={10} /> {p.upvotes?.length || 0}</span>
                      <span className="flex items-center gap-1"><MessageCircle size={10} /> {p.replies?.length || 0}</span>
                      <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => statusMut.mutate({ id: p._id, body: { status: "active" } })}
                      className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition" title="Approve">
                      <CheckCircle size={13} />
                    </button>
                    <button onClick={() => statusMut.mutate({ id: p._id, body: { isFeatured: !p.isFeatured } })}
                      className={`p-1.5 rounded-lg transition ${p.isFeatured ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500 hover:bg-amber-50 hover:text-amber-600"}`} title="Feature">
                      <Star size={13} />
                    </button>
                    <button onClick={() => statusMut.mutate({ id: p._id, body: { status: "flagged" } })}
                      className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition" title="Flag">
                      <Flag size={13} />
                    </button>
                    <button onClick={() => deleteMut.mutate(p._id)}
                      className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition" title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
        {!isLoading && posts.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">No posts found</div>
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
