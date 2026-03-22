import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, SlidersHorizontal, X, Leaf, ShoppingCart, MessageCircle,
  TrendingUp, TrendingDown, Star, MapPin, Package, ChevronLeft,
  ChevronRight, Zap, BarChart2, Filter, RefreshCw, Eye, Award, AlertCircle,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { searchCrops, getHighDemandCrops, addToCart } from "../../api/marketplaceApi";
import useCartStore from "../../store/cartStore.js";
import useMarketSocket from "../../hooks/useMarketSocket.js";

const SORT_OPTIONS = [
  { value: "latest",        label: "Latest" },
  { value: "price_low",     label: "Price: Low → High" },
  { value: "price_high",    label: "Price: High → Low" },
  { value: "best_fit",      label: "AI Best Fit" },
  { value: "trending",      label: "Trending" },
  { value: "quantity_high", label: "Most Available" },
];
const GRADE_OPTIONS = ["A", "B", "C"];
const QUALITY_OPTIONS = [
  { value: "",        label: "All Types" },
  { value: "organic", label: "Organic" },
  { value: "normal",  label: "Normal" },
];
const CROP_CATEGORIES = [
  "Wheat","Rice","Maize","Tomato","Onion","Potato","Cotton",
  "Soybean","Groundnut","Sugarcane","Chilli","Mango","Banana",
];
const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80";

const gradeColor = (g) =>
  g === "A" ? "text-emerald-700 bg-emerald-50 border-emerald-200"
  : g === "B" ? "text-amber-700 bg-amber-50 border-amber-200"
  : "text-red-600 bg-red-50 border-red-200";

const demandColor = (score) =>
  score >= 70 ? "text-emerald-700" : score >= 45 ? "text-amber-600" : "text-red-500";

const demandLabel = (score) =>
  score >= 70 ? "High Demand" : score >= 45 ? "Moderate" : "Low Demand";

const demandBarColor = (score) =>
  score >= 70 ? "bg-emerald-500" : score >= 45 ? "bg-amber-500" : "bg-red-400";

/* ─── CropCard ──────────────────────────────────────────────────── */
function CropCard({ crop, onAddToCart, onChat, onView }) {
  const [imgErr, setImgErr] = useState(false);
  const demand = crop.aiSellReadiness ?? 60;
  const outOfStock = crop.quantity <= 0 || crop.status === "sold";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: outOfStock ? 0 : -4 }}
      transition={{ duration: 0.22 }}
      className={`group relative bg-white border rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer ${
        crop._isNew
          ? "border-green-400 ring-2 ring-green-200"
          : outOfStock
          ? "border-slate-200 opacity-70"
          : "border-slate-100 hover:border-green-300 hover:shadow-md"
      }`}
      onClick={() => !outOfStock && onView(crop.id)}
    >
      {/* image */}
      <div className="relative h-44 overflow-hidden bg-slate-100">
        <img
          src={imgErr || !crop.image ? PLACEHOLDER_IMG : crop.image}
          alt={crop.cropName}
          onError={() => setImgErr(true)}
          className={`w-full h-full object-cover transition-transform duration-500 ${!outOfStock && "group-hover:scale-105"}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

        {/* Out of stock overlay */}
        {outOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="px-3 py-1.5 rounded-full bg-red-600 text-white text-xs font-bold flex items-center gap-1.5">
              <AlertCircle size={12} /> Out of Stock
            </span>
          </div>
        )}

        {/* New listing badge */}
        {crop._isNew && (
          <div className="absolute bottom-3 left-3">
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-600 text-white text-[10px] font-bold shadow-lg"
            >
              <Sparkles size={9} /> New Listing
            </motion.span>
          </div>
        )}

        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
          {crop.qualityType === "organic" && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold backdrop-blur-sm">
              <Leaf size={9} /> Organic
            </span>
          )}
          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold backdrop-blur-sm ${gradeColor(crop.grade)}`}>
            Grade {crop.grade}
          </span>
        </div>
        {crop.negotiable && !outOfStock && (
          <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-semibold backdrop-blur-sm">
            Negotiable
          </span>
        )}
      </div>

      {/* body */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-slate-800 font-semibold text-base leading-tight line-clamp-1">
            {crop.cropName}
            {crop.variety ? <span className="text-slate-400 font-normal text-sm ml-1">· {crop.variety}</span> : null}
          </h3>
          <div className="text-right shrink-0">
            <motion.p
              key={crop.price}
              initial={crop._priceFlash ? { color: "#16a34a", scale: 1.1 } : false}
              animate={{ color: "#15803d", scale: 1 }}
              transition={{ duration: 0.6 }}
              className="text-green-700 font-bold text-lg leading-none"
            >
              ₹{crop.price}
            </motion.p>
            <p className="text-slate-400 text-[10px]">/{crop.quantityUnit ?? "kg"}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-slate-500 text-xs mb-3">
          <MapPin size={10} />
          <span className="truncate">{crop.location?.city}, {crop.location?.state}</span>
          <span className="mx-1 text-slate-300">·</span>
          <span className="truncate text-slate-400">{crop.farmer?.name}</span>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className={`flex items-center gap-1 text-xs font-medium ${outOfStock ? "text-red-500" : "text-slate-500"}`}>
            <Package size={11} />
            <span>{outOfStock ? "Out of stock" : `${crop.quantity?.toLocaleString()} ${crop.quantityUnit ?? "kg"}`}</span>
          </div>
          <div className={`flex items-center gap-1 text-xs font-medium ${demandColor(demand)}`}>
            {demand >= 50 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            <span>{demandLabel(demand)}</span>
          </div>
          <div className="flex items-center gap-0.5 text-amber-500 text-xs">
            <Star size={10} fill="currentColor" />
            <span>{crop.farmer?.rating ?? "4.6"}</span>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span className="flex items-center gap-1"><Zap size={9} className="text-green-600" /> AI Demand Score</span>
            <span className={demandColor(demand)}>{demand}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${demand}%` }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className={`h-full rounded-full ${demandBarColor(demand)}`}
            />
          </div>
        </div>

        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => !outOfStock && onAddToCart(crop)}
            disabled={outOfStock}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              outOfStock
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-green-700 hover:bg-green-800 text-white"
            }`}
          >
            <ShoppingCart size={13} /> {outOfStock ? "Out of Stock" : "Add to Cart"}
          </button>
          <button
            onClick={() => onChat(crop)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 text-xs font-semibold transition-all"
          >
            <MessageCircle size={13} />
          </button>
          <button
            onClick={() => onView(crop.id)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 text-xs font-semibold transition-all"
          >
            <Eye size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── TrendingPanel ─────────────────────────────────────────────── */
function TrendingPanel({ crops }) {
  if (!crops?.length) return null;
  return (
    <div className="mb-8 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-green-50">
          <BarChart2 size={16} className="text-green-700" />
        </div>
        <h2 className="text-slate-800 font-semibold text-sm">AI Demand Forecast — Trending Now</h2>
        <span className="ml-auto text-[10px] text-slate-400 flex items-center gap-1">
          <Zap size={9} className="text-green-600" /> XGBoost Model
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {crops.slice(0, 8).map((c, i) => {
          const score = c.demandScore ?? c.aiSellReadiness ?? 70;
          return (
            <div key={c.id ?? i} className="shrink-0 flex items-center gap-2.5 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 min-w-[140px]">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${score >= 70 ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                {i + 1}
              </div>
              <div>
                <p className="text-slate-800 text-xs font-semibold leading-tight">{c.cropName}</p>
                <p className={`text-[10px] font-medium flex items-center gap-0.5 ${score >= 70 ? "text-green-700" : "text-amber-600"}`}>
                  <TrendingUp size={9} /> {score}% demand
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── FilterSidebar ─────────────────────────────────────────────── */
function FilterSidebar({ filters, onChange, onReset, onClose }) {
  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -20, opacity: 0 }}
      className="bg-white border border-slate-100 rounded-2xl p-5 space-y-5 sticky top-24 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-slate-800 font-semibold text-sm flex items-center gap-2">
          <Filter size={14} className="text-green-700" /> Filters
        </h3>
        <div className="flex gap-2">
          <button onClick={onReset} className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors">
            <RefreshCw size={10} /> Reset
          </button>
          {onClose && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 lg:hidden">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="text-slate-500 text-xs font-medium mb-2 block">Crop Category</label>
        <select value={filters.crop} onChange={(e) => onChange("crop", e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-xs focus:outline-none focus:border-green-500">
          <option value="">All Crops</option>
          {CROP_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div>
        <label className="text-slate-500 text-xs font-medium mb-2 block">Quality Type</label>
        <div className="flex gap-2">
          {QUALITY_OPTIONS.map((q) => (
            <button key={q.value} onClick={() => onChange("quality", q.value)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                filters.quality === q.value
                  ? "bg-green-700 border-green-700 text-white"
                  : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
              }`}>
              {q.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-slate-500 text-xs font-medium mb-2 block">Grade</label>
        <div className="flex gap-2">
          {["", ...GRADE_OPTIONS].map((g) => (
            <button key={g} onClick={() => onChange("grade", g)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                filters.grade === g
                  ? "bg-green-700 border-green-700 text-white"
                  : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
              }`}>
              {g || "All"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-slate-500 text-xs font-medium mb-2 block">Price Range (₹/kg)</label>
        <div className="flex gap-2">
          <input type="number" placeholder="Min" value={filters.minPrice} onChange={(e) => onChange("minPrice", e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-xs focus:outline-none focus:border-green-500 placeholder-slate-400" />
          <input type="number" placeholder="Max" value={filters.maxPrice} onChange={(e) => onChange("maxPrice", e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-xs focus:outline-none focus:border-green-500 placeholder-slate-400" />
        </div>
      </div>

      <div>
        <label className="text-slate-500 text-xs font-medium mb-2 block">Location</label>
        <input type="text" placeholder="City or State" value={filters.location} onChange={(e) => onChange("location", e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-xs focus:outline-none focus:border-green-500 placeholder-slate-400" />
      </div>

      <div>
        <label className="text-slate-500 text-xs font-medium mb-2 block">Sort By</label>
        <select value={filters.sort} onChange={(e) => onChange("sort", e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-xs focus:outline-none focus:border-green-500">
          {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
    </motion.div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────── */
const DEFAULT_FILTERS = {
  search: "", crop: "", quality: "", grade: "", minPrice: "", maxPrice: "",
  location: "", sort: "latest",
};

export default function Marketplace() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setCart } = useCartStore();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [crops, setCrops] = useState([]);
  const [trending, setTrending] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const searchTimer = useRef(null);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(filters.search), 420);
    return () => clearTimeout(searchTimer.current);
  }, [filters.search]);

  const fetchCrops = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page, limit: 12, sort: filters.sort,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(filters.crop && { crop: filters.crop }),
        ...(filters.quality && { quality: filters.quality }),
        ...(filters.grade && { grade: filters.grade }),
        ...(filters.location && { location: filters.location }),
        ...(filters.minPrice && { minPrice: filters.minPrice }),
        ...(filters.maxPrice && { maxPrice: filters.maxPrice }),
      };
      const res = await searchCrops(params);
      setCrops(res.listings ?? []);
      setPagination(res.pagination ?? { page: 1, totalPages: 1, total: 0 });
    } catch {
      toast.error("Failed to load listings");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters.crop, filters.quality, filters.grade, filters.location, filters.minPrice, filters.maxPrice, filters.sort]);

  useEffect(() => { fetchCrops(1); }, [fetchCrops]);

  useEffect(() => {
    getHighDemandCrops({ limit: 8 })
      .then((data) => setTrending(Array.isArray(data) ? data : data?.listings ?? []))
      .catch(() => {});
  }, []);

  // ── Real-time socket events ──────────────────────────────────────
  useMarketSocket({
    // Live stock updates → update quantity/status on cards
    stock_update: ({ cropId, quantity, outOfStock }) => {
      setCrops((prev) =>
        prev.map((c) =>
          (c.id ?? c._id) === cropId
            ? { ...c, quantity, status: outOfStock ? "sold" : c.status, _priceFlash: false }
            : c
        )
      );
    },
    // Live price updates → flash the price on the card
    crop_price_update: ({ cropId, price, priceData }) => {
      const newPrice = price ?? priceData?.price;
      if (!newPrice) return;
      setCrops((prev) =>
        prev.map((c) =>
          (c.id ?? c._id) === cropId
            ? { ...c, price: newPrice, _priceFlash: true }
            : c
        )
      );
      // Clear flash flag after animation
      setTimeout(() => {
        setCrops((prev) =>
          prev.map((c) => ((c.id ?? c._id) === cropId ? { ...c, _priceFlash: false } : c))
        );
      }, 1200);
    },
    // New listing → prepend to feed with "New" badge
    new_crop_listing: ({ listing }) => {
      if (!listing) return;
      const normalized = {
        ...listing,
        id: listing._id ?? listing.id,
        _isNew: true,
      };
      setCrops((prev) => {
        // Avoid duplicates
        if (prev.some((c) => (c.id ?? c._id) === normalized.id)) return prev;
        return [normalized, ...prev];
      });
      setPagination((p) => ({ ...p, total: p.total + 1 }));
      toast.success(`New listing: ${listing.cropName ?? "Crop"} added`, {
        icon: "🌱",
        duration: 4000,
      });
      // Remove "new" badge after 30s
      setTimeout(() => {
        setCrops((prev) =>
          prev.map((c) => ((c.id ?? c._id) === normalized.id ? { ...c, _isNew: false } : c))
        );
      }, 30000);
    },
  });

  const handleFilterChange = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));
  const handleReset = () => setFilters(DEFAULT_FILTERS);
  const handleAddToCart = async (crop) => {
    try {
      const data = await addToCart({ cropId: crop.id, quantity: 1 });
      setCart(data);
      queryClient.setQueryData(["cart"], data);
      toast.success(`${crop.cropName} added to cart`);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Failed to add to cart");
    }
  };
  const handleChat = (crop) => navigate(`/buyer/chat?cropId=${crop.id}&farmerId=${crop.farmer?.id}`);
  const handleView = (id) => navigate(`/buyer/cropdetails?id=${id}`);
  const activeFilterCount = Object.entries(filters).filter(([k, v]) => k !== "sort" && k !== "search" && v !== "").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef]">
      {/* Hero Banner */}
      <div className="bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">
                  <Award size={11} /> AI-Powered Marketplace
                </span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-2">
                Fresh Crops, <span className="text-green-700">Direct from Farms</span>
              </h1>
              <p className="text-slate-500 text-sm max-w-lg">
                Discover verified crop listings with real-time AI demand scores, price intelligence, and direct farmer chat.
              </p>
            </div>
            <div className="w-full lg:w-[420px]">
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search wheat, organic rice, tomatoes..."
                  value={filters.search} onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3.5 text-slate-700 text-sm placeholder-slate-400 focus:outline-none focus:border-green-500 focus:bg-white transition-all" />
                {filters.search && (
                  <button onClick={() => handleFilterChange("search", "")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <TrendingPanel crops={trending} />

        {/* Mobile filter toggle */}
        <div className="flex items-center justify-between mb-6 lg:hidden">
          <button onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm shadow-sm">
            <SlidersHorizontal size={14} />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-green-700 text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          <p className="text-slate-500 text-sm">{pagination.total} listings</p>
        </div>

        <div className="flex gap-7">
          <div className="hidden lg:block w-60 shrink-0">
            <FilterSidebar filters={filters} onChange={handleFilterChange} onReset={handleReset} />
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setShowFilters(false)}>
                <motion.div initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
                  className="absolute left-0 top-0 bottom-0 w-72 bg-white p-5 overflow-y-auto shadow-xl"
                  onClick={(e) => e.stopPropagation()}>
                  <FilterSidebar filters={filters} onChange={handleFilterChange} onReset={handleReset} onClose={() => setShowFilters(false)} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <p className="text-slate-500 text-sm">
                  <span className="text-slate-800 font-semibold">{pagination.total}</span> listings found
                </p>
                {activeFilterCount > 0 && (
                  <button onClick={handleReset} className="flex items-center gap-1 text-xs text-green-700 hover:text-green-800">
                    <X size={11} /> Clear filters
                  </button>
                )}
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-slate-400 text-xs">Sort:</span>
                <select value={filters.sort} onChange={(e) => handleFilterChange("sort", e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 text-xs focus:outline-none focus:border-green-500">
                  {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="bg-white border border-slate-100 rounded-2xl overflow-hidden animate-pulse shadow-sm">
                    <div className="h-44 bg-slate-100" />
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-slate-100 rounded w-3/4" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                      <div className="h-8 bg-slate-100 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : crops.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <Search size={24} className="text-slate-300" />
                </div>
                <p className="text-slate-600 font-medium mb-1">No listings found</p>
                <p className="text-slate-400 text-sm">Try adjusting your filters or search term</p>
                <button onClick={handleReset} className="mt-4 px-4 py-2 rounded-xl bg-green-700 text-white text-sm hover:bg-green-800 transition-all">
                  Clear all filters
                </button>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                <motion.div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {crops.map((crop) => (
                    <CropCard key={crop.id} crop={crop} onAddToCart={handleAddToCart} onChat={handleChat} onView={handleView} />
                  ))}
                </motion.div>
              </AnimatePresence>
            )}

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-10">
                <button onClick={() => fetchCrops(pagination.page - 1)} disabled={pagination.page <= 1}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm">
                  <ChevronLeft size={14} /> Prev
                </button>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
                    const p = i + 1;
                    return (
                      <button key={p} onClick={() => fetchCrops(p)}
                        className={`w-9 h-9 rounded-xl text-sm font-medium transition-all ${
                          p === pagination.page
                            ? "bg-green-700 text-white"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}>
                        {p}
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => fetchCrops(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm">
                  Next <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
