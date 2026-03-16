import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, Heart, Minus } from "lucide-react";

const fmt = (v) =>
  `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Number(v || 0))}`;

const TREND = {
  rising:  { icon: ArrowUp,   color: "text-emerald-700", bg: "bg-emerald-50", label: "Rising" },
  falling: { icon: ArrowDown, color: "text-red-600",     bg: "bg-red-50",     label: "Falling" },
  stable:  { icon: Minus,     color: "text-amber-600",   bg: "bg-amber-50",   label: "Stable" }
};

const CropCard = ({ item, index }) => {
  const trend = TREND[item.demandTrend] || TREND.stable;
  const TrendIcon = trend.icon;

  return (
    <motion.article
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      whileHover={{ y: -5, boxShadow: "0 20px 40px -12px rgba(0,0,0,0.12)" }}
      className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
    >
      <div className="relative h-32 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
        {item.cropImage ? (
          <img src={item.cropImage} alt={item.cropName} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">🌿</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
        <div className={`absolute top-2 right-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${trend.bg} ${trend.color}`}>
          <TrendIcon size={10} />
          {trend.label}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-slate-900 text-sm mb-2">{item.cropName}</h3>
        <div className="flex items-center justify-between text-xs">
          <div>
            <p className="text-slate-500">Avg Price</p>
            <p className="font-bold text-slate-900 text-base">{fmt(item.averagePrice)}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-500">Purchases</p>
            <p className="font-bold text-slate-900 text-base">{item.purchases}</p>
          </div>
        </div>
      </div>
    </motion.article>
  );
};

const FavoriteCrops = ({ favoriteCrops, isLoading }) => {
  const rows = Array.isArray(favoriteCrops) ? favoriteCrops : [];

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="inline-flex rounded-xl bg-rose-50 p-2.5">
          <Heart size={18} className="text-rose-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Favorite Crops</h2>
          <p className="text-sm text-slate-500">Your most frequently purchased crops</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : rows.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((item, i) => (
            <CropCard key={`${item.cropName}_${i}`} item={item} index={i} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
          No favorite crops yet. Start purchasing to see your favorites here.
        </div>
      )}
    </section>
  );
};

export default FavoriteCrops;
