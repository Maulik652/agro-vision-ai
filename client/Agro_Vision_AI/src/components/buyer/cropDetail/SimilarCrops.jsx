import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { MapPin, Star, Leaf, TrendingUp } from "lucide-react";

const PLACEHOLDER = "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80";

const gradeColor = (g) =>
  g === "A" ? "text-emerald-700 bg-emerald-50 border-emerald-200"
  : g === "B" ? "text-amber-700 bg-amber-50 border-amber-200"
  : "text-red-600 bg-red-50 border-red-200";

export default function SimilarCrops({ crops = [] }) {
  const navigate = useNavigate();
  if (!crops.length) return null;

  return (
    <div>
      <h3 className="text-slate-800 font-semibold text-sm mb-4 flex items-center gap-2">
        <TrendingUp size={15} className="text-green-700" /> Similar Listings
        <span className="text-slate-400 font-normal">({crops.length})</span>
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {crops.slice(0, 6).map((crop, i) => (
          <motion.button
            key={crop.id ?? i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            whileHover={{ y: -3 }}
            onClick={() => navigate(`/buyer/cropdetails?id=${crop.id}`)}
            className="bg-white border border-slate-100 rounded-xl overflow-hidden text-left hover:border-green-300 hover:shadow-md transition-all group"
          >
            {/* Image */}
            <div className="relative h-28 overflow-hidden bg-slate-100">
              <img src={crop.image || PLACEHOLDER} alt={crop.cropName}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
                onError={(e) => { e.target.src = PLACEHOLDER; }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              <div className="absolute top-2 left-2 flex gap-1">
                {crop.qualityType === "organic" && (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-semibold backdrop-blur-sm">
                    <Leaf size={8} /> Org
                  </span>
                )}
                <span className={`px-1.5 py-0.5 rounded-full border text-[9px] font-bold backdrop-blur-sm ${gradeColor(crop.grade)}`}>
                  {crop.grade}
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="p-3">
              <p className="text-slate-800 text-xs font-semibold truncate mb-0.5">{crop.cropName}</p>
              {crop.variety && <p className="text-slate-400 text-[10px] truncate mb-1">{crop.variety}</p>}
              <p className="text-green-700 text-sm font-bold">₹{crop.price}
                <span className="text-slate-400 text-[10px] font-normal">/{crop.quantityUnit ?? "kg"}</span>
              </p>
              {crop.location && (
                <div className="flex items-center gap-1 text-slate-400 text-[10px] mt-1">
                  <MapPin size={9} /> {crop.location.city}
                </div>
              )}
              {crop.farmer?.rating && (
                <div className="flex items-center gap-1 text-amber-500 text-[10px] mt-1">
                  <Star size={9} fill="currentColor" /> {crop.farmer.rating}
                </div>
              )}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
