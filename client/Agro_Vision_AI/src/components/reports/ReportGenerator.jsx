import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, FileText, Table, Loader2, CheckCircle, X, AlertCircle } from "lucide-react";
import { generateReport } from "../../api/reportsApi.js";
import toast from "react-hot-toast";

const ReportGenerator = ({ filters, compact = false }) => {
  const [status,    setStatus]    = useState("idle"); // idle | loading | done | error
  const [format,    setFormat]    = useState(null);
  const [filename,  setFilename]  = useState("");
  const [showPanel, setShowPanel] = useState(false);

  const generate = async (fmt) => {
    setStatus("loading");
    setFormat(fmt);
    setFilename("");
    try {
      const result = await generateReport({ filters, format: fmt });
      setFilename(result.filename || "");
      setStatus("done");
      toast.success(`${fmt.toUpperCase()} downloaded`);
      setTimeout(() => { setStatus("idle"); setFormat(null); }, 3000);
    } catch (err) {
      setStatus("error");
      const msg = err?.response?.data?.message || "Export failed. Try again.";
      toast.error(msg);
      setTimeout(() => { setStatus("idle"); setFormat(null); }, 3500);
    }
  };

  const isLoading = (fmt) => status === "loading" && format === fmt;

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowPanel((p) => !p)}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium transition-colors shadow-sm"
        >
          <Download size={13} />
          <span className="hidden sm:inline">Export</span>
        </button>

        <AnimatePresence>
          {showPanel && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              className="absolute right-0 top-10 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 w-60"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-700">Export Report</span>
                <button onClick={() => setShowPanel(false)} className="p-1 rounded hover:bg-slate-100 text-slate-400">
                  <X size={12} />
                </button>
              </div>

              {/* Status feedback */}
              <AnimatePresence>
                {status === "done" && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-2 mb-3"
                  >
                    <CheckCircle size={12} />
                    <span className="truncate">Downloaded: {filename || "report"}</span>
                  </motion.div>
                )}
                {status === "error" && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-2 mb-3"
                  >
                    <AlertCircle size={12} /> Export failed. Try again.
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <button
                  onClick={() => generate("pdf")}
                  disabled={status === "loading"}
                  className="w-full flex items-center gap-2 px-3 py-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium hover:bg-rose-100 transition-colors disabled:opacity-50"
                >
                  {isLoading("pdf") ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
                  {isLoading("pdf") ? "Generating PDF…" : "Export as PDF"}
                </button>
                <button
                  onClick={() => generate("excel")}
                  disabled={status === "loading"}
                  className="w-full flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-medium hover:bg-emerald-100 transition-colors disabled:opacity-50"
                >
                  {isLoading("excel") ? <Loader2 size={13} className="animate-spin" /> : <Table size={13} />}
                  {isLoading("excel") ? "Generating Excel…" : "Export as Excel"}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-2.5 text-center">Includes all filtered data</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Full panel (standalone use)
  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Download size={18} className="text-slate-600" />
        <h3 className="font-semibold text-slate-800">Export Report</h3>
      </div>

      <AnimatePresence>
        {status === "done" && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-3"
          >
            <CheckCircle size={14} />
            <span className="truncate">Downloaded: {filename || "report"}</span>
          </motion.div>
        )}
        {status === "error" && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3"
          >
            <AlertCircle size={14} /> Export failed. Try again.
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => generate("pdf")}
          disabled={status === "loading"}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium hover:bg-rose-100 transition-colors disabled:opacity-50"
        >
          {isLoading("pdf") ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
          {isLoading("pdf") ? "Generating…" : "Export PDF"}
        </button>
        <button
          onClick={() => generate("excel")}
          disabled={status === "loading"}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-medium hover:bg-emerald-100 transition-colors disabled:opacity-50"
        >
          {isLoading("excel") ? <Loader2 size={15} className="animate-spin" /> : <Table size={15} />}
          {isLoading("excel") ? "Generating…" : "Export Excel"}
        </button>
      </div>
    </div>
  );
};

export default ReportGenerator;
