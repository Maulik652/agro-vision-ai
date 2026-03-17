import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Edit2, Trash2, PauseCircle, PlayCircle, CheckCircle, Eye, MapPin, Calendar, Tag, Leaf, TrendingUp, MoreVertical, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { deleteCropListing, pauseCropListing } from "../../../api/marketplaceApi";

const STATUS_STYLES = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  paused: "bg-amber-100 text-amber-700 border-amber-200",
  sold: "bg-slate-100 text-slate-600 border-slate-200",
  expired: "bg-rose-100 text-rose-700 border-rose-200",
};

const GRADE_COLORS = { A: "bg-emerald-500", B: "bg-blue-500", C: "bg-amber-500" };

export default function ListingCard({ listing, onChanged }) {
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const qc = useQueryClient();

  const { mutate: doDelete, isPending: deleting } = useMutation({
    mutationFn: () => deleteCropListing(listing._id),
    onSuccess: () => { toast.success("Listing deleted"); onChanged?.(); setConfirmDelete(false); },
    onError: (e) => toast.error(e?.response?.data?.message || "Delete failed"),
  });

  const { mutate: doPause, isPending: pausing } = useMutation({
    mutationFn: () => pauseCropListing(listing._id),
    onSuccess: () => { toast.success(listing.status === "active" ? "Listing paused" : "Listing activated"); onChanged?.(); },
    onError: (e) => toast.error(e?.response?.data?.message || "Action failed"),
  });

  const img = listing.image || `https://source.unsplash.com/400x300/?${encodeURIComponent(listing.cropName)},farm`;
  const isActive = listing.status === "active";
  const isSold = listing.status === "sold";

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} whileHover={{ y: -3 }} className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm hover:shadow-lg transition-all">
      {/* Image */}
      <div className="relative h-40 overflow-hidden bg-slate-100">
        <img src={img} alt={listing.cropName} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(e) => { e.target.src = `https://placehold.co/400x300/e2e8f0/64748b?text=${listing.cropName}`; }} />
        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <div className="absolute top-2 left-2 flex gap-1.5">
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${STATUS_STYLES[listing.status] || STATUS_STYLES.active}`}>{listing.status}</span>
          {listing.qualityType === "organic" && <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">🌿 Organic</span>}
        </div>
        <div className="absolute top-2 right-2">
          <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black text-white ${GRADE_COLORS[listing.grade] || "bg-slate-500"}`}>{listing.grade}</div>
        </div>
        <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white">
          <Eye size={11} /><span className="text-[10px] font-semibold">{listing.views || 0} views</span>
        </div>
        {/* Menu */}
        <div className="absolute bottom-2 right-2">
          <button onClick={() => setShowMenu((v) => !v)} className="flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 transition">
            <MoreVertical size={13} />
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div initial={{ opacity: 0, scale: 0.9, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute bottom-9 right-0 z-20 w-36 rounded-xl border border-slate-200 bg-white shadow-xl">
                {!isSold && (
                  <button onClick={() => { doPause(); setShowMenu(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-t-xl transition">
                    {isActive ? <PauseCircle size={13} className="text-amber-500" /> : <PlayCircle size={13} className="text-emerald-500" />}
                    {isActive ? "Pause" : "Activate"}
                  </button>
                )}
                <button onClick={() => { setConfirmDelete(true); setShowMenu(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-b-xl transition">
                  <Trash2 size={13} /> Delete
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-slate-800">{listing.cropName}</h3>
            {listing.variety && <p className="text-[10px] text-slate-500">{listing.variety}</p>}
          </div>
          <div className="text-right">
            <p className="text-base font-black text-emerald-700">₹{listing.price?.toLocaleString("en-IN")}</p>
            <p className="text-[10px] text-slate-500">per {listing.quantityUnit}</p>
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Tag size={10} className="text-slate-400" />
            <span>{listing.quantity?.toLocaleString("en-IN")} {listing.quantityUnit} available</span>
          </div>
          {listing.location?.city && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <MapPin size={10} className="text-slate-400" />
              <span>{listing.location.city}, {listing.location.state}</span>
            </div>
          )}
          {listing.harvestDate && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Calendar size={10} className="text-slate-400" />
              <span>Harvested: {new Date(listing.harvestDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
          )}
        </div>

        {listing.aiSuggestedPrice && (
          <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-1.5">
            <TrendingUp size={11} className="text-violet-600" />
            <span className="text-[10px] font-semibold text-violet-700">AI suggested: ₹{listing.aiSuggestedPrice}/{listing.quantityUnit}</span>
            {listing.aiConfidence && <span className="ml-auto text-[9px] text-violet-500">{listing.aiConfidence}% conf.</span>}
          </div>
        )}
      </div>

      {/* Delete Confirm */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/95 backdrop-blur-sm p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100"><Trash2 size={18} className="text-rose-600" /></div>
            <p className="text-center text-sm font-bold text-slate-800">Delete this listing?</p>
            <p className="text-center text-xs text-slate-500">This action cannot be undone.</p>
            <div className="flex gap-2 w-full">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
              <button onClick={() => doDelete()} disabled={deleting} className="flex-1 rounded-xl bg-rose-600 py-2 text-xs font-bold text-white hover:bg-rose-700 transition disabled:opacity-60">{deleting ? "Deleting..." : "Delete"}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
