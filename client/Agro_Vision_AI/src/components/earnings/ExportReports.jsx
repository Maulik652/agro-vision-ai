import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, FileText, Table, Loader2, CheckCircle, X } from "lucide-react";
import { exportEarnings } from "../../api/earningsApi.js";

const ExportReports = ({ filters }) => {
  const [open, setOpen]     = useState(false);
  const [status, setStatus] = useState("idle");

  const generate = async (format) => {
    setStatus("loading");
    try {
      await exportEarnings({ filters, format });
      setStatus("done");
      setTimeout(() => { setStatus("idle"); setOpen(false); }, 2500);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(p => !p)}
        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium transition-colors shadow-sm">
        <Download size={13} />
        <span className="hidden sm:inline">Export</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }}
            className="absolute right-0 top-10 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 w-56">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-700">Export Earnings</span>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-slate-100 text-slate-400"><X size={12} /></button>
            </div>

            {status === "done" && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-2 mb-3">
                <CheckCircle size={12} /> Generated successfully
              </div>
            )}
            {status === "error" && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-2 mb-3">
                Failed. Try again.
              </div>
            )}

            <div className="space-y-2">
              <button onClick={() => generate("pdf")} disabled={status === "loading"}
                className="w-full flex items-center gap-2 px-3 py-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium hover:bg-rose-100 transition-colors disabled:opacity-50">
                {status === "loading" ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
                Export as PDF
              </button>
              <button onClick={() => generate("excel")} disabled={status === "loading"}
                className="w-full flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-medium hover:bg-emerald-100 transition-colors disabled:opacity-50">
                {status === "loading" ? <Loader2 size={13} className="animate-spin" /> : <Table size={13} />}
                Export as Excel
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2.5 text-center">Includes filtered data</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExportReports;
