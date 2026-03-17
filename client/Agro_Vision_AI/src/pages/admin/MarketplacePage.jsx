import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, CheckCircle, XCircle, Eye } from "lucide-react";
import { fetchAdminListings, updateListingStatus } from "../../api/adminApi";
import toast from "react-hot-toast";

const STATUS_BADGE = {
  active: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
  inactive: "bg-slate-100 text-slate-600",
};

export default function MarketplacePage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-listings", { search, status, page }],
    queryFn: () => fetchAdminListings({ search, status, page, limit: 20 }),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status: s }) => updateListingStatus(id, s),
    onSuccess: () => { qc.invalidateQueries(["admin-listings"]); toast.success("Listing updated"); },
    onError: () => toast.error("Failed"),
  });

  const listings = data?.data || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
          Marketplace Control
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">{total} total crop listings</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white flex-1 min-w-48">
          <Search size={14} className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search listings..."
            className="flex-1 text-sm outline-none text-slate-700 placeholder:text-slate-400"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {["Crop", "Farmer", "Price/kg", "Quantity", "Status", "Listed", "Actions"].map((h) => (
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
                : listings.map((l) => (
                    <motion.tr key={l._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-medium text-slate-800">{l.cropName || l.name}</td>
                      <td className="px-4 py-3 text-slate-500">{l.farmer?.name || "—"}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">₹{l.pricePerKg || l.price || 0}</td>
                      <td className="px-4 py-3 text-slate-500">{l.quantity || 0} kg</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_BADGE[l.status] || STATUS_BADGE.inactive}`}>
                          {l.status || "inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{new Date(l.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => statusMut.mutate({ id: l._id, status: "active" })} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition" title="Approve">
                            <CheckCircle size={13} />
                          </button>
                          <button onClick={() => statusMut.mutate({ id: l._id, status: "rejected" })} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition" title="Reject">
                            <XCircle size={13} />
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
            <p className="text-xs text-slate-400">Page {page} of {pages}</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Prev</button>
              <button disabled={page === pages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
