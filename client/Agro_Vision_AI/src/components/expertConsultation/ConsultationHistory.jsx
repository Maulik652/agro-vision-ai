import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { History, Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchConsultationHistory } from "../../api/consultationApi";

export default function ConsultationHistory() {
  const [filters, setFilters] = useState({ crop: "", date: "" });
  const [page, setPage] = useState(1);
  const set = (k) => (e) => { setFilters((f) => ({ ...f, [k]: e.target.value })); setPage(1); };

  const { data, isLoading } = useQuery({
    queryKey: ["consultation-history", filters, page],
    queryFn: () => fetchConsultationHistory({ ...filters, page, limit: 10 }),
    staleTime: 60_000,
    keepPreviousData: true
  });

  const rows = data?.consultations || [];
  const totalPages = data?.pages || 1;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">

      <div className="flex items-center gap-2 mb-5">
        <History size={18} className="text-teal-600" />
        <h2 className="text-slate-900 font-semibold text-base">Consultation History</h2>
        {data?.total != null && (
          <span className="ml-auto text-xs text-slate-400">{data.total} completed</span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[140px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={filters.crop} onChange={set("crop")} placeholder="Filter by crop..."
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl pl-8 pr-3 py-2 text-xs outline-none focus:border-teal-400 transition" />
        </div>
        <input type="date" value={filters.date} onChange={set("date")}
          className="bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs outline-none focus:border-teal-400 transition" />
        {(filters.crop || filters.date) && (
          <button onClick={() => { setFilters({ crop: "", date: "" }); setPage(1); }}
            className="text-xs text-slate-500 hover:text-slate-700 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition">
            Clear
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="h-40 flex items-center justify-center">
          <Loader2 className="animate-spin text-teal-500" size={28} />
        </div>
      ) : rows.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No completed consultations found</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {["ID", "User", "Crop", "Category", "Fee", "Completed", "Duration"].map((h) => (
                    <th key={h} className="text-left text-xs text-slate-400 font-medium pb-3 pr-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const duration = row.completedAt && row.createdAt
                    ? Math.round((new Date(row.completedAt) - new Date(row.createdAt)) / 3_600_000)
                    : null;
                  return (
                    <motion.tr key={row._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className="border-b border-slate-50 hover:bg-slate-50 transition">
                      <td className="py-3 pr-4 text-slate-400 text-xs font-mono">#{String(row._id).slice(-6).toUpperCase()}</td>
                      <td className="py-3 pr-4 text-slate-900 font-medium whitespace-nowrap">{row.user?.name || "—"}</td>
                      <td className="py-3 pr-4 text-slate-700 whitespace-nowrap">{row.cropType}</td>
                      <td className="py-3 pr-4 text-slate-500 capitalize whitespace-nowrap">{row.problemCategory}</td>
                      <td className="py-3 pr-4 text-emerald-600 whitespace-nowrap">
                        {row.consultationFee > 0 ? `₹${row.consultationFee}` : "Free"}
                      </td>
                      <td className="py-3 pr-4 text-slate-400 text-xs whitespace-nowrap">
                        {row.completedAt
                          ? new Date(row.completedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                          : "—"}
                      </td>
                      <td className="py-3 text-slate-400 text-xs whitespace-nowrap">
                        {duration != null ? `${duration}h` : "—"}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-30 transition">
                  <ChevronLeft size={14} />
                </button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-30 transition">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
