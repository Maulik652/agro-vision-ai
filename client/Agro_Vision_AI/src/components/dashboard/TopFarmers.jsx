import { motion } from "framer-motion";
import { Star, Users } from "lucide-react";

const fmt = (v) =>
  `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(v || 0))}`;

const StarRating = ({ rating }) => {
  const val = Math.min(5, Math.max(0, Number(rating || 0)));
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={12} className={i < Math.round(val) ? "fill-amber-400 text-amber-400" : "text-slate-200 fill-slate-200"} />
      ))}
      <span className="ml-1.5 text-xs font-medium text-slate-500">{val.toFixed(1)}</span>
    </div>
  );
};

const TopFarmers = ({ farmers, isLoading }) => {
  const rows = Array.isArray(farmers) ? farmers : [];

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="inline-flex rounded-xl bg-teal-50 p-2.5">
          <Users size={18} className="text-teal-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Top Farmers Network</h2>
          <p className="text-sm text-slate-500">Farmers you interact with most</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : rows.length ? (
        <ul className="space-y-2">
          {rows.map((farmer, index) => (
            <motion.li
              key={`${farmer.farmerName}_${index}`}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.06 }}
              className="flex items-center justify-between gap-4 rounded-xl p-3 hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 text-sm font-bold text-white shadow-sm">
                    {String(farmer.farmerName || "F").charAt(0).toUpperCase()}
                  </span>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{farmer.farmerName}</p>
                  <StarRating rating={farmer.averageRating} />
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-slate-900">{farmer.ordersCount} orders</p>
                <p className="text-xs text-slate-500">{fmt(farmer.totalSpend)}</p>
              </div>
            </motion.li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
          No farmer data available yet.
        </div>
      )}
    </section>
  );
};

export default TopFarmers;
