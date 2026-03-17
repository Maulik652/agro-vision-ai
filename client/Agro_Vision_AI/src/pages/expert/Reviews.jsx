import React, { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Star, RefreshCw, MessageSquare, ShieldAlert, Leaf, BarChart2, PenLine, SlidersHorizontal, X } from "lucide-react";

import ReviewOverview      from "../../components/reviews/ReviewOverview.jsx";
import ReviewList          from "../../components/reviews/ReviewList.jsx";
import ReviewAnalytics     from "../../components/reviews/ReviewAnalytics.jsx";
import SentimentAnalysisCard from "../../components/reviews/SentimentAnalysisCard.jsx";
import SpamDetectionPanel  from "../../components/reviews/SpamDetectionPanel.jsx";
import ModerationPanel     from "../../components/reviews/ModerationPanel.jsx";
import QualityReviews      from "../../components/reviews/QualityReviews.jsx";
import WriteReviewModal    from "../../components/reviews/WriteReviewModal.jsx";

import {
  fetchOverview, fetchFeed, fetchAnalytics,
  fetchQualityReviews, fetchModerationQueue
} from "../../api/reviewsApi.js";

const STALE = 60_000;

const TABS = [
  { key: "overview",    label: "Overview",    icon: Star         },
  { key: "reviews",     label: "Reviews",     icon: MessageSquare},
  { key: "analytics",   label: "Analytics",   icon: BarChart2    },
  { key: "quality",     label: "Quality",     icon: Leaf         },
  { key: "moderation",  label: "Moderation",  icon: ShieldAlert  },
];

const Reviews = () => {
  const [tab,          setTab]          = useState("overview");
  const [showFilters,  setShowFilters]  = useState(false);
  const [showWrite,    setShowWrite]    = useState(false);
  const [feedFilters,  setFeedFilters]  = useState({ sort: "latest", role: "", page: 1 });
  const [modFilters,   setModFilters]   = useState({ page: 1 });
  const [qualFilters,  setQualFilters]  = useState({ page: 1 });
  const qc = useQueryClient();

  const mergeFeed = (patch) => setFeedFilters(p => ({ ...p, ...patch }));
  const mergeMod  = (patch) => setModFilters(p => ({ ...p, ...patch }));
  const mergeQual = (patch) => setQualFilters(p => ({ ...p, ...patch }));

  const overview    = useQuery({ queryKey: ["reviews-overview"],                    queryFn: fetchOverview,                                  staleTime: STALE });
  const feed        = useQuery({ queryKey: ["reviews-feed",    feedFilters],        queryFn: () => fetchFeed(feedFilters),                   staleTime: STALE, enabled: tab === "reviews"    });
  const analytics   = useQuery({ queryKey: ["reviews-analytics"],                  queryFn: () => fetchAnalytics(),                         staleTime: STALE, enabled: tab === "analytics"  });
  const quality     = useQuery({ queryKey: ["quality-reviews", qualFilters],       queryFn: () => fetchQualityReviews(qualFilters),          staleTime: STALE, enabled: tab === "quality"    });
  const modQueue    = useQuery({ queryKey: ["moderation-queue", modFilters],       queryFn: () => fetchModerationQueue(modFilters),          staleTime: 30_000, enabled: tab === "moderation" });

  const refreshAll = useCallback(() => {
    ["reviews-overview","reviews-feed","reviews-analytics","quality-reviews","moderation-queue"]
      .forEach(k => qc.invalidateQueries({ queryKey: [k] }));
  }, [qc]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef]">

      {/* Sticky top bar */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-8">

          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <Star size={18} className="text-amber-700" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base font-bold text-slate-900 leading-none">Reviews & Reputation</h1>
                <p className="text-[11px] text-slate-400 mt-0.5">Trust & Feedback Engine</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setShowFilters(p => !p)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                  showFilters ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}>
                <SlidersHorizontal size={13} /> Filters
              </button>
              <button onClick={refreshAll} disabled={overview.isLoading}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
                <RefreshCw size={13} className={overview.isLoading ? "animate-spin" : ""} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button onClick={() => setShowWrite(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium transition-colors shadow-sm">
                <PenLine size={13} />
                <span className="hidden sm:inline">Write Review</span>
              </button>
            </div>
          </div>

          {/* Collapsible filter bar */}
          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-t border-slate-100">
                <div className="py-3 flex flex-wrap items-end gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Role</label>
                    <select value={feedFilters.role || ""} onChange={e => mergeFeed({ role: e.target.value, page: 1 })}
                      className="text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50">
                      <option value="">All Roles</option>
                      <option value="farmer">Farmer</option>
                      <option value="buyer">Buyer</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Sort</label>
                    <select value={feedFilters.sort || "latest"} onChange={e => mergeFeed({ sort: e.target.value, page: 1 })}
                      className="text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50">
                      <option value="latest">Latest</option>
                      <option value="highest">Highest Rated</option>
                      <option value="lowest">Lowest Rated</option>
                    </select>
                  </div>
                  <button onClick={() => { setFeedFilters({ sort: "latest", role: "", page: 1 }); setShowFilters(false); }}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-2 py-2 transition-colors">
                    <X size={12} /> Clear
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tab nav */}
          <div className="flex gap-0.5 -mb-px pt-1">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  tab === key ? "border-amber-500 text-amber-700" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}>
                <Icon size={13} /> {label}
                {key === "moderation" && (modQueue.data?.total || 0) > 0 && (
                  <span className="ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">{modQueue.data.total}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-6 space-y-6">

        {/* KPI strip — always visible */}
        <ReviewOverview data={overview.data} loading={overview.isLoading} />

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>

            {/* OVERVIEW tab */}
            {tab === "overview" && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                  <ReviewAnalytics data={analytics.data} loading={analytics.isLoading} />
                </div>
                <div className="space-y-6">
                  <SentimentAnalysisCard reviews={feed.data?.reviews || []} loading={feed.isLoading} />
                  <SpamDetectionPanel    reviews={feed.data?.reviews || []} loading={feed.isLoading} />
                </div>
              </div>
            )}

            {/* REVIEWS tab */}
            {tab === "reviews" && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                  <ReviewList data={feed.data} loading={feed.isLoading} filters={feedFilters} onFilterChange={mergeFeed} />
                </div>
                <div className="space-y-6">
                  <SentimentAnalysisCard reviews={feed.data?.reviews || []} loading={feed.isLoading} />
                  <SpamDetectionPanel    reviews={feed.data?.reviews || []} loading={feed.isLoading} />
                </div>
              </div>
            )}

            {/* ANALYTICS tab */}
            {tab === "analytics" && (
              <ReviewAnalytics data={analytics.data} loading={analytics.isLoading} />
            )}

            {/* QUALITY tab */}
            {tab === "quality" && (
              <QualityReviews data={quality.data} loading={quality.isLoading} filters={qualFilters} onFilterChange={mergeQual} />
            )}

            {/* MODERATION tab */}
            {tab === "moderation" && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                  <ModerationPanel data={modQueue.data} loading={modQueue.isLoading} filters={modFilters} onFilterChange={mergeMod} />
                </div>
                <div className="space-y-6">
                  <SpamDetectionPanel reviews={modQueue.data?.reviews || []} loading={modQueue.isLoading} />
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      <WriteReviewModal open={showWrite} onClose={() => setShowWrite(false)} targetUserId="" />
    </div>
  );
};

export default Reviews;
