import { motion } from "framer-motion";
import { Warehouse, Package, CheckCircle, PauseCircle, TrendingUp, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getInventory } from "../../../api/farmerMarketplaceApi";

const STATUS_STYLES = {
  active:  { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  sold:    { bg: "bg-slate-100",   text: "text-slate-600",   border: "border-slate-200",   dot: "bg-slate-400" },
  paused:  { bg: "bg-amber-100",   text: "text-amber-700",   border: "border-amber-200",   dot: "bg-amber-500" },
  expired: { bg: "bg-rose-100",    text: "text-rose-700",    border: "border-rose-200",     dot: "bg-rose-500" },
};

const GRADE_COLORS = { A: "bg-emerald-500", B: "bg-blue-500", C: "bg-amber-500" };

export default function InventoryPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["farmerInventory"],
    queryFn: getInventory,
    staleTime: 60000,
    retry: 1,
  });

  const inventory = data?.inventory || [];
  const stats = data?.stats || {};

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-8 w-8 rounded-xl bg-slate-200 animate-pulse" />
          <div className="h-5 w-32 rounded bg-slate-200 animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />)}
        </div>
        {[1,2,3,4].map(i => <div key={i} className="mb-3 h-14 rounded-xl bg-slate-100 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100">
          <Warehouse size={16} className="text-teal-600" />
        </div>
        <div>
          <h3 className="text-base font-black text-slate-800">Inventory Management</h3>
          <p className="text-[11px] text-slate-500">Stock overview across all listings</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-4">
        {[
          { label: "Total Items",   value: stats.totalItems || 0,  icon: Package,      color: "text-slate-700",   bg: "bg-slate-50" },
          { label: "Active Stock",  value: `${stats.totalStock || 0} units`, icon: TrendingUp, color: "text-emerald-700", bg: "bg-emerald-50" },
          { label: "Sold Stock",    value: `${stats.soldStock || 0} units`,  icon: CheckCircle, color: "text-blue-700",   bg: "bg-blue-50" },
          { label: "Paused Stock",  value: `${stats.pausedStock || 0} units`,icon: PauseCircle, color: "text-amber-700",  bg: "bg-amber-50" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl ${s.bg} p-3`}>
            <div className="flex items-center gap-1.5 mb-1">
              <s.icon size={13} className={s.color} />
              <p className="text-[10px] font-bold text-slate-500">{s.label}</p>
            </div>
            <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {inventory.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <Warehouse size={28} className="text-slate-300" />
          <p className="text-sm font-semibold text-slate-500">No inventory yet</p>
          <p className="text-xs text-slate-400">Create listings from the Sell Crop page</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Crop", "Quantity", "Price", "Grade", "Type", "Views", "Status"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inventory.map(item => {
                const st = STATUS_STYLES[item.status] || STATUS_STYLES.active;
                return (
                  <motion.tr key={item._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                    <td className="px-3 py-3 font-bold text-slate-800">{item.cropName}</td>
                    <td className="px-3 py-3 text-slate-600">{item.quantity?.toLocaleString("en-IN")} {item.unit}</td>
                    <td className="px-3 py-3 font-bold text-emerald-700">₹{item.price?.toLocaleString("en-IN")}</td>
                    <td className="px-3 py-3">
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black text-white ${GRADE_COLORS[item.grade] || "bg-slate-400"}`}>
                        {item.grade || "B"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${item.qualityType === "organic" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {item.qualityType || "normal"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-500">{item.views}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${st.bg} ${st.border} ${st.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                        {item.status}
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
