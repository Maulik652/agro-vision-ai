import { MapPin, Star, CheckCircle, Package, TrendingUp, Award, Clock } from "lucide-react";

export default function FarmerCard({ farmer, crop }) {
  if (!farmer && !crop?.farmer) return null;
  const f = farmer ?? crop?.farmer ?? {};
  const rating = f.rating ?? 4.6;
  const stars = Math.round(rating);

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
      <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Farmer Profile</h3>

      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-200 border border-green-200 flex items-center justify-center text-green-800 text-xl font-bold">
            {(f.name ?? "F")[0].toUpperCase()}
          </div>
          {f.verified !== false && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-600 flex items-center justify-center">
              <CheckCircle size={11} className="text-white" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-slate-800 font-semibold text-base leading-tight">{f.name ?? "Farmer"}</p>
              {(f.farmLocation || f.location) && (
                <div className="flex items-center gap-1 text-slate-400 text-xs mt-0.5">
                  <MapPin size={10} /> {f.farmLocation ?? f.location}
                </div>
              )}
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              {[1,2,3,4,5].map((s) => (
                <Star key={s} size={12}
                  className={s <= stars ? "text-amber-400 fill-amber-400" : "text-slate-200"} />
              ))}
              <span className="text-amber-600 text-xs font-bold ml-1">{rating}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-3 mt-3">
            {f.activeListings != null && (
              <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                <Package size={11} className="text-blue-500" />
                <span>{f.activeListings} active listings</span>
              </div>
            )}
            {f.totalReviews != null && (
              <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                <Star size={11} className="text-amber-400" />
                <span>{f.totalReviews} reviews</span>
              </div>
            )}
            {f.totalSales != null && f.totalSales > 0 && (
              <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                <TrendingUp size={11} className="text-green-600" />
                <span>₹{(f.totalSales / 1000).toFixed(0)}K+ sales</span>
              </div>
            )}
          </div>

          {/* Certifications */}
          {f.certifications?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {f.certifications.slice(0, 3).map((c, i) => (
                <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px]">
                  <Award size={9} /> {c}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {crop?.responseSlaHours && (
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-slate-400 text-xs">
          <Clock size={11} /> Typically responds within {crop.responseSlaHours}h
        </div>
      )}
    </div>
  );
}
