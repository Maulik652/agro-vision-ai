import React, { useState, useEffect, useCallback } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, Plus, ThumbsUp, ThumbsDown, Eye, Send,
  Search, Loader2, X, User, Award, Clock, ChevronRight,
  ArrowLeft, RefreshCw, Bug, CloudSun,
  TrendingUp, Lightbulb, Star, MessageSquare, BookOpen
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getCommunityPosts, getCommunityPost, createCommunityPost,
  replyCommunityPost, voteCommunityPost
} from "../../api/farmerApi";
import toast from "react-hot-toast";

const CATEGORIES = [
  { key: "question", label: "Question", icon: MessageCircle, badge: "bg-blue-100 text-blue-700 border-blue-200", iconBg: "bg-blue-50 text-blue-600" },
  { key: "tip", label: "Farming Tip", icon: Lightbulb, badge: "bg-amber-100 text-amber-700 border-amber-200", iconBg: "bg-amber-50 text-amber-600" },
  { key: "success-story", label: "Success Story", icon: Star, badge: "bg-emerald-100 text-emerald-700 border-emerald-200", iconBg: "bg-emerald-50 text-emerald-600" },
  { key: "market-update", label: "Market Update", icon: TrendingUp, badge: "bg-green-100 text-green-700 border-green-200", iconBg: "bg-green-50 text-green-600" },
  { key: "weather-alert", label: "Weather Alert", icon: CloudSun, badge: "bg-sky-100 text-sky-700 border-sky-200", iconBg: "bg-sky-50 text-sky-600" },
  { key: "pest-warning", label: "Pest Warning", icon: Bug, badge: "bg-red-100 text-red-700 border-red-200", iconBg: "bg-red-50 text-red-600" },
  { key: "technique", label: "Technique", icon: BookOpen, badge: "bg-orange-100 text-orange-700 border-orange-200", iconBg: "bg-orange-50 text-orange-600" },
  { key: "general", label: "General", icon: MessageSquare, badge: "bg-slate-100 text-slate-600 border-slate-200", iconBg: "bg-slate-100 text-slate-500" }
];

const CAT_META = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));
const CROP_TAGS = ["Wheat", "Rice", "Tomato", "Cotton", "Maize", "Soybean", "Groundnut", "Sugarcane", "Onion", "Potato"];
const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.05 } } };

const Community = () => {
  useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [loadingPost, setLoadingPost] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const [saving, setSaving] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterCrop] = useState("");
  const [sort, setSort] = useState("latest");
  const [, setTotal] = useState(0);
  const [form, setForm] = useState({ title: "", content: "", category: "question", cropTag: "" });

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { sort, limit: 30 };
      if (filterCat !== "all") params.category = filterCat;
      if (filterCrop) params.cropTag = filterCrop;
      const res = await getCommunityPosts(params);
      if (res.success) { setPosts(res.posts || []); setTotal(res.total || 0); }
    } catch { toast.error("Failed to load community"); }
    finally { setLoading(false); }
  }, [filterCat, filterCrop, sort]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const openPost = async (id) => {
    setLoadingPost(true);
    try {
      const res = await getCommunityPost(id);
      if (res.success) setSelectedPost(res.post);
    } catch { toast.error("Failed to load post"); }
    finally { setLoadingPost(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return toast.error("Title and content required");
    setSaving(true);
    try {
      const res = await createCommunityPost(form);
      if (res.success) {
        toast.success("Posted!");
        setShowNewPost(false);
        setForm({ title: "", content: "", category: "question", cropTag: "" });
        fetchPosts();
      }
    } catch { toast.error("Failed to create post"); }
    finally { setSaving(false); }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedPost) return;
    setSendingReply(true);
    try {
      const res = await replyCommunityPost(selectedPost._id, replyText);
      if (res.success) { setSelectedPost(res.post); setReplyText(""); toast.success("Reply posted"); }
    } catch { toast.error("Failed to reply"); }
    finally { setSendingReply(false); }
  };

  const handleVote = async (id, type) => {
    try {
      const res = await voteCommunityPost(id, type);
      if (res.success) {
        setPosts((prev) => prev.map((p) => p._id === id ? { ...p, upvotes: Array(res.upvotes).fill(0), downvotes: Array(res.downvotes).fill(0) } : p));
        if (selectedPost?._id === id) setSelectedPost((prev) => ({ ...prev, upvotes: Array(res.upvotes).fill(0), downvotes: Array(res.downvotes).fill(0) }));
      }
    } catch { toast.error("Failed to vote"); }
  };

  const filteredPosts = search
    ? posts.filter((p) => p.title?.toLowerCase().includes(search.toLowerCase()) || p.content?.toLowerCase().includes(search.toLowerCase()))
    : posts;

  const timeAgo = (date) => {
    const mins = Math.floor((Date.now() - new Date(date)) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  };

  /* ═══════ POST DETAIL VIEW ═══════ */
  if (selectedPost) {
    const catMeta = CAT_META[selectedPost.category] || CAT_META.general;
    const CatIcon = catMeta.icon;
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button onClick={() => setSelectedPost(null)} className="flex items-center gap-2 text-slate-500 hover:text-green-700 text-sm mb-6 transition">
            <ArrowLeft size={16} /> Back to Community
          </button>
          {loadingPost && <div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-green-700" /></div>}
          {!loadingPost && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 border ${catMeta.badge}`}>
                    <CatIcon size={12} /> {catMeta.label}
                  </span>
                  {selectedPost.cropTag && <span className="px-2 py-0.5 rounded bg-green-50 border border-green-200 text-green-700 text-xs">{selectedPost.cropTag}</span>}
                  <span className="text-xs text-slate-400 flex items-center gap-1 ml-auto"><Eye size={10} /> {selectedPost.views}</span>
                </div>
                <h1 className="text-xl font-bold text-slate-900 mb-3">{selectedPost.title}</h1>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedPost.content}</p>
                <div className="flex items-center gap-4 mt-5 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <User size={14} className="text-green-700" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-slate-800">{selectedPost.author?.name || "Farmer"}</span>
                      {selectedPost.author?.role === "expert" && <Award size={12} className="text-amber-500 inline ml-1" />}
                      <p className="text-[10px] text-slate-400">{selectedPost.author?.city}, {selectedPost.author?.state}</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 ml-auto">{timeAgo(selectedPost.createdAt)}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleVote(selectedPost._id, "upvote")} className="flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-green-100 hover:text-green-700 text-xs text-slate-600 transition">
                      <ThumbsUp size={12} /> {selectedPost.upvotes?.length || 0}
                    </button>
                    <button onClick={() => handleVote(selectedPost._id, "downvote")} className="flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-red-100 hover:text-red-600 text-xs text-slate-600 transition">
                      <ThumbsDown size={12} /> {selectedPost.downvotes?.length || 0}
                    </button>
                  </div>
                </div>
              </div>
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">{selectedPost.replies?.length || 0} Replies</h3>
                <div className="space-y-3">
                  {(selectedPost.replies || []).map((r, i) => (
                    <motion.div key={i} variants={fadeUp} initial="hidden" animate="visible"
                      className={`p-4 rounded-xl border ${r.isExpert ? "bg-amber-50 border-amber-200" : "bg-white border-slate-100"}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${r.isExpert ? "bg-amber-100" : "bg-slate-100"}`}>
                          {r.isExpert ? <Award size={12} className="text-amber-600" /> : <User size={12} className="text-slate-500" />}
                        </div>
                        <span className="text-sm font-medium text-slate-800">{r.author?.name || "User"}</span>
                        {r.isExpert && <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-medium">Expert</span>}
                        <span className="text-[10px] text-slate-400 ml-auto">{timeAgo(r.createdAt)}</span>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">{r.content}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className="sticky bottom-4 p-4 rounded-xl bg-white border border-slate-200 shadow-lg flex items-center gap-3">
                <input value={replyText} onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleReply()}
                  placeholder="Write a reply..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-green-500 text-slate-700 placeholder-slate-400" />
                <button onClick={handleReply} disabled={sendingReply || !replyText.trim()} className="p-2.5 rounded-lg bg-green-700 hover:bg-green-800 disabled:bg-slate-200 text-white transition">
                  {sendingReply ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  /* ═══════ POST LISTING VIEW ═══════ */
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-900">
              <div className="w-12 h-12 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center">
                <MessageCircle size={24} className="text-green-700" />
              </div>
              Farmer Community
            </h1>
            <p className="text-slate-500 text-sm mt-1">Share knowledge, ask questions, learn from fellow farmers</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchPosts} className="p-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition"><RefreshCw size={16} /></button>
            <button onClick={() => setShowNewPost(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-700 hover:bg-green-800 text-white transition text-sm font-medium shadow-sm">
              <Plus size={16} /> New Post
            </button>
          </div>
        </motion.div>

        <div className="flex flex-col gap-3 mb-6">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl px-4 focus-within:border-green-500 transition shadow-sm">
            <Search size={16} className="text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search posts..."
              className="flex-1 bg-transparent py-2.5 px-3 text-sm outline-none text-slate-700 placeholder-slate-400" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilterCat("all")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterCat === "all" ? "bg-green-700 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}>All</button>
            {CATEGORIES.map((c) => (
              <button key={c.key} onClick={() => setFilterCat(c.key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition ${filterCat === c.key ? "bg-green-700 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}>
                <c.icon size={11} /> {c.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {["latest", "popular", "most_replies"].map((s) => (
              <button key={s} onClick={() => setSort(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${sort === s ? "bg-slate-200 text-slate-800" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"}`}>
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {loading && <div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-green-700" /></div>}

        {!loading && (
          <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
            {filteredPosts.map((post) => {
              const catMeta = CAT_META[post.category] || CAT_META.general;
              const CatIcon = catMeta.icon;
              return (
                <motion.div key={post._id} variants={fadeUp} onClick={() => openPost(post._id)}
                  className="p-5 rounded-xl bg-white border border-slate-100 hover:border-green-300 hover:shadow-sm cursor-pointer transition-all group shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${catMeta.iconBg}`}>
                      <CatIcon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${catMeta.badge}`}>{catMeta.label}</span>
                        {post.cropTag && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 border border-green-200 text-green-700">{post.cropTag}</span>}
                      </div>
                      <h3 className="text-sm font-semibold text-slate-800 mb-1 group-hover:text-green-700 transition">{post.title}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2">{post.content}</p>
                      <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1"><User size={10} /> {post.author?.name || "Farmer"}</span>
                        <span className="flex items-center gap-1"><Clock size={10} /> {timeAgo(post.createdAt)}</span>
                        <span className="flex items-center gap-1"><Eye size={10} /> {post.views || 0}</span>
                        <span className="flex items-center gap-1"><MessageSquare size={10} /> {post.replies?.length || 0}</span>
                        <span className="flex items-center gap-1"><ThumbsUp size={10} /> {post.upvotes?.length || 0}</span>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-green-600 transition shrink-0 mt-1" />
                  </div>
                </motion.div>
              );
            })}
            {filteredPosts.length === 0 && (
              <div className="py-16 text-center">
                <MessageCircle size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-400">No posts yet. Be the first to share!</p>
              </div>
            )}
          </motion.div>
        )}

        <AnimatePresence>
          {showNewPost && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
              onClick={() => setShowNewPost(false)}>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2"><Plus size={18} className="text-green-700" /> New Post</h3>
                  <button onClick={() => setShowNewPost(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X size={18} /></button>
                </div>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Title *</label>
                    <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g. How to manage tomato blight in Gujarat?"
                      className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-green-500" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Category *</label>
                      <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700 outline-none appearance-none">
                        {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Crop Tag</label>
                      <select value={form.cropTag} onChange={(e) => setForm({ ...form, cropTag: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700 outline-none appearance-none">
                        <option value="">Select</option>
                        {CROP_TAGS.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Content *</label>
                    <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
                      rows={5} placeholder="Describe your question, tip, or story..."
                      className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700 placeholder-slate-400 outline-none resize-none focus:border-green-500" required />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowNewPost(false)} className="flex-1 py-2.5 rounded-lg bg-slate-100 border border-slate-200 text-sm text-slate-600 hover:bg-slate-200 transition">Cancel</button>
                    <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg bg-green-700 hover:bg-green-800 text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition">
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Post
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Community;
