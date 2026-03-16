/**
 * RecommendedCrops — horizontal scroll cards with AI-suggested crops
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ShoppingCart, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PLACEHOLDER = "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=300&q=70";

function CropCard({ crop, onAdd, adding }) {
  const [imgErr, setImgErr] = useState(false);
  const navigate = useNavigate();

  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="shrink-0 w-44 bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => navigate(`/buyer/crop/${crop._id}`)}
    >
      <div className="h-28 overflow-hidden bg-slate-100">
        <img
          src={imgErr || !crop.image ? PLACEHOLDER : crop.image}
          alt={crop.cropName}
          onError={() => setImgErr(true)}
          loading="lazy"
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="p-3">
        <p className="text-slate-800 text-xs font-semibold truncate">{crop.cropName}</p>
        <p className="text-green-700 text-xs font-bold mt-0.5">
          ₹{crop.price?.toLocaleString("en-IN")}/{crop.quantityUnit ?? "kg"}
        </p>
        <p className="text-slate-400 text-[10px] truncate mt-0.5">{crop.location?.city}</p>
        <button
          onClick={(e) => { e.stopPropagation(); onAdd(crop._id); }}
          disabled={adding === crop._id}
          className="mt-2 w-full flex items-center justify-center gap-1 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-[11px] font-semibold transition-colors disabled:opacity-50"
        >
          <ShoppingCart size={10} />
          {adding === crop._id ? "Adding..." : "Add to Cart"}
        </button>
      </div>
    </motion.div>
  );
}

export default function RecommendedCrops({ crops, onAdd, isLoading }) {
  const navigate = useNavigate();
  const [adding, setAdding] = useState(null);

  const handleAdd = async (cropId) => {
    setAdding(cropId);
    await onAdd(cropId, 1);
    setAdding(null);
  };

  if (isLoading) {
    return (
      <div className="mt-8">
        <div className="h-5 w-40 bg-slate-200 rounded animate-pulse mb-4" />
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="shrink-0 w-44 h-48 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!crops?.length) return null;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-700 font-semibold text-sm flex items-center gap-2">
          <Sparkles size={14} className="text-amber-500" />
          You might also like
        </h3>
        <button
          onClick={() => navigate("/buyer/marketplace")}
          className="flex items-center gap-1 text-green-700 text-xs hover:text-green-800 transition-colors"
        >
          View all <ArrowRight size={12} />
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {crops.map((crop) => (
          <CropCard key={crop._id} crop={crop} onAdd={handleAdd} adding={adding} />
        ))}
      </div>
    </div>
  );
}
