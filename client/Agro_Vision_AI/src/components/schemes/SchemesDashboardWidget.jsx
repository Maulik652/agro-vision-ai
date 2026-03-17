import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Landmark,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Tag,
  IndianRupee,
  FileText,
} from "lucide-react";
import api from "../../api/axios";

const CATEGORY_COLORS = {
  subsidy:        { bg: "bg-green-100",  text: "text-green-700",  border: "border-green-200"  },
  insurance:      { bg: "bg-blue-100",   text: "text-blue-700",   border: "border-blue-200"   },
  loan:           { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" },
  irrigation:     { bg: "bg-cyan-100",   text: "text-cyan-700",   border: "border-cyan-200"   },
  organic:        { bg: "bg-lime-100",   text: "text-lime-700",   border: "border-lime-200"   },
  infrastructure: { bg: "bg-amber-100",  text: "text-amber-700",  border: "border-amber-200"  },
  market:         { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
  other:          { bg: "bg-slate-100",  text: "text-slate-600",  border: "border-slate-200"  },
};

const fetchSchemes = async () => {
  const { data } = await api.get("/schemes?status=active");
  return data.schemes || [];
};

const SchemeCard = ({ scheme, index }) => {
  const [expanded, setExpanded] = useState(false);
  const colors = CATEGORY_COLORS[scheme.category] || CATEGORY_COLORS.other;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      className="min-w-[280px] max-w-[300px] shrink-0 rounded-2xl border border-green-100/80 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border} mb-1.5`}>
              <Tag size={9} />
              {scheme.category?.toUpperCase()}
            </span>
            <h3 className="text-sm font-bold text-slate-800 leading-snug line-clamp-2">
              {scheme.shortName || scheme.name}
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">{scheme.ministry}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center shrink-0">
            <Landmark size={16} className="text-green-700" />
          </div>
        </div>

        {/* Benefit snippet */}
        <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{scheme.benefits}</p>

        {/* Amount badge */}
        {scheme.amount?.max > 0 && (
          <div className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-1">
            <IndianRupee size={10} />
            {scheme.amount.unit}
          </div>
        )}

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((p) => !p)}
          className="w-full flex items-center justify-between text-xs font-medium text-green-700 hover:text-green-800 transition pt-1 border-t border-slate-100"
        >
          <span>{expanded ? "Show less" : "Learn more"}</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {/* Expanded content */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="space-y-2.5 pt-1">
                <p className="text-xs text-slate-600 leading-relaxed">{scheme.description}</p>

                {scheme.documents?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                      <FileText size={10} /> Documents needed
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {scheme.documents.map((doc) => (
                        <span key={doc} className="text-[10px] bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">
                          {doc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {scheme.applicationUrl && (
                  <a
                    href={scheme.applicationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-green-700 hover:bg-green-800 rounded-lg px-3 py-1.5 transition"
                  >
                    Apply Now <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const SchemesDashboardWidget = () => {
  const { data: schemes = [], isLoading } = useQuery({
    queryKey: ["schemes-widget"],
    queryFn: fetchSchemes,
    staleTime: 1000 * 60 * 10,
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-green-100/80 bg-white/70 backdrop-blur-md p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded bg-slate-200 animate-pulse" />
          <div className="h-4 w-48 rounded bg-slate-200 animate-pulse" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="min-w-[280px] h-36 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!schemes.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-green-100/80 bg-white/70 backdrop-blur-md shadow-sm p-5"
    >
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center">
            <Landmark size={16} className="text-green-700" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">Government Schemes</h2>
            <p className="text-xs text-slate-500">{schemes.length} active schemes available for you</p>
          </div>
        </div>
        <span className="text-[10px] font-semibold text-green-700 bg-green-50 border border-green-100 rounded-full px-2.5 py-1">
          LIVE
        </span>
      </div>

      {/* Horizontal scroll strip */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-green-200 scrollbar-track-transparent">
        {schemes.map((scheme, i) => (
          <SchemeCard key={scheme._id} scheme={scheme} index={i} />
        ))}
      </div>
    </motion.div>
  );
};

export default SchemesDashboardWidget;
