import { motion } from "framer-motion";
import { Activity, Loader2 } from "lucide-react";

export default function FarmerActivityTable({ data = [], isLoading }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6"
    >
      <div className="flex items-center gap-2 mb-5">
        <Activity size={18} className="text-teal-600" />
        <h2 className="text-slate-800 font-semibold text-base">Farmer Activity Monitor</h2>
      </div>

      {isLoading ? (
        <div className="h-40 flex items-center justify-center">
          <Loader2 className="animate-spin text-teal-500" size={28} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Farmer", "Crop Listed", "Quantity", "Location", "Price", "Listed"].map((h) => (
                  <th key={h} className="text-left text-xs text-slate-400 font-medium pb-3 pr-4 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 10).map((row, i) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="border-b border-slate-50 hover:bg-slate-50 transition"
                >
                  <td className="py-2.5 pr-4 text-slate-800 font-medium whitespace-nowrap">{row.farmerName}</td>
                  <td className="py-2.5 pr-4 text-slate-600 whitespace-nowrap">{row.cropListed}</td>
                  <td className="py-2.5 pr-4 text-slate-600 whitespace-nowrap">{row.quantity}</td>
                  <td className="py-2.5 pr-4 text-slate-400 whitespace-nowrap">{row.location}{row.state ? `, ${row.state}` : ""}</td>
                  <td className="py-2.5 pr-4 text-emerald-600 whitespace-nowrap">₹{row.price}</td>
                  <td className="py-2.5 text-slate-400 text-xs whitespace-nowrap">
                    {new Date(row.listedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {data.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-8">No recent activity</p>
          )}
        </div>
      )}
    </motion.div>
  );
}
