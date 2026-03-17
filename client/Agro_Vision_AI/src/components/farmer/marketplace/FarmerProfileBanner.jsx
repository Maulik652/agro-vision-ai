import { motion } from "framer-motion";
import { MapPin, Wheat, Star, Award } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getFarmerProfile } from "../../../api/farmerMarketplaceApi";

const fmt = (v) => {
  const n = Number(v);
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n || 0}`;
};

export default function FarmerProfileBanner() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["farmerProfile"],
    queryFn: getFarmerProfile,
    staleTime: 120000,
    retry: 1,
  });
  const profile = data?.profile || {};

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 flex items-center gap-4">
        <div className="h-16 w-16 rounded-2xl bg-slate-200 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-40 rounded bg-slate-200" />
          <div className="h-3 w-56 rounded bg-slate-200" />
        </div>
      </div>
    );
  }

  const initials = (profile.name || "F").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-emerald-200/60 bg-gradient-to-r from-emerald-50 via-white to-teal-50 p-5 shadow-sm"
    >
      <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-emerald-100/60 blur-2xl" />

      <div className="flex flex-wrap items-center gap-4">
        {/* Avatar */}
        <div className="relative shrink-0">
          {profile.photo ? (
            <img src={profile.photo} alt={profile.name} className="h-16 w-16 rounded-2xl object-cover border-2 border-emerald-200" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-xl font-black text-white shadow-md">
              {initials}
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 border-2 border-white">
            <Award size={10} className="text-white" />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-black text-slate-800">{profile.name || "Farmer"}</h2>
            <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              Verified Seller
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            {(profile.city || profile.state) && (
              <span className="flex items-center gap-1">
                <MapPin size={11} className="text-slate-400" />
                {[profile.city, profile.state].filter(Boolean).join(", ")}
              </span>
            )}
            {profile.crops && (
              <span className="flex items-center gap-1">
                <Wheat size={11} className="text-slate-400" />
                {profile.crops}
              </span>
            )}
            {profile.farmSize && (
              <span className="flex items-center gap-1">
                <Star size={11} className="text-slate-400" />
                {profile.farmSize} acres
              </span>
            )}
          </div>
          {profile.bio && <p className="mt-1 text-xs text-slate-500 line-clamp-1">{profile.bio}</p>}
          <p className="mt-1 text-[10px] font-semibold text-emerald-600">{profile.platform} — {profile.tagline}</p>
        </div>

        {/* Stats */}
        <div className="flex gap-4 shrink-0">
          {[
            { label: "Listings", value: profile.totalListings || 0, color: "text-emerald-700" },
            { label: "Active",   value: profile.activeListings || 0, color: "text-blue-700" },
            { label: "Earned",   value: fmt(profile.totalEarnings || 0), color: "text-violet-700" },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
