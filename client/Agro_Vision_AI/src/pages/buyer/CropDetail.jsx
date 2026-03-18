import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Eye, Share2, Heart } from "lucide-react";
import toast from "react-hot-toast";

import CropGallery from "../../components/buyer/cropDetail/CropGallery";
import CropInfo from "../../components/buyer/cropDetail/CropInfo";
import FarmerCard from "../../components/buyer/cropDetail/FarmerCard";
import AIInsights from "../../components/buyer/cropDetail/AIInsights";
import QualityMetrics from "../../components/buyer/cropDetail/QualityMetrics";
import ActionPanel from "../../components/buyer/cropDetail/ActionPanel";
import PriceHistoryChart from "../../components/buyer/cropDetail/PriceHistoryChart";
import ReviewSection from "../../components/buyer/cropDetail/ReviewSection";
import SimilarCrops from "../../components/buyer/cropDetail/SimilarCrops";
import ChatPanel from "../../components/buyer/cropDetail/ChatPanel";

import {
  fetchCropDetail, fetchSimilarCrops, fetchAICropInsights,
  addCropToCart, fetchFarmerDetail
} from "../../api/cropDetailApi";
import useCartStore from "../../store/cartStore.js";
import useStockSocket from "../../hooks/useStockSocket.js";
import useOfferSocket from "../../hooks/useOfferSocket.js";

function Skeleton({ className }) {
  return <div className={`animate-pulse bg-slate-100 rounded-xl ${className}`} />;
}

function LoadingSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <Skeleton className="h-5 w-40 mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-5">
          <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
        <div className="lg:col-span-4">
          <Skeleton className="h-[520px] rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export default function CropDetail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cropId = searchParams.get("id");

  const queryClient = useQueryClient();
  const { setCart } = useCartStore();

  const [crop, setCrop] = useState(null);
  const [farmer, setFarmer] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [aiInsights, setAiInsights] = useState(null);
  const [aiSource, setAiSource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addingCart, setAddingCart] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!cropId) { navigate("/buyer/marketplace"); return; }
    setLoading(true);
    Promise.all([
      fetchCropDetail(cropId),
      fetchSimilarCrops(cropId).catch(() => []),
      fetchAICropInsights(cropId).catch(() => null),
    ]).then(([detail, sim, ai]) => {
      setCrop(detail);
      setSimilar(sim ?? []);
      setAiInsights(ai?.insights ?? ai ?? null);
      setAiSource(ai?.source ?? null);
      if (detail?.farmer?.id) {
        fetchFarmerDetail(detail.farmer.id)
          .then((f) => setFarmer(f?.farmer ?? f))
          .catch(() => {});
      }
    }).catch(() => toast.error("Failed to load crop details"))
      .finally(() => setLoading(false));
  }, [cropId, navigate]);

  useStockSocket(({ cropId: updatedId, quantity, outOfStock }) => {
    if (updatedId === cropId) {
      setCrop((prev) => prev ? { ...prev, quantity, status: outOfStock ? "sold" : prev.status } : prev);
      if (outOfStock) toast("This crop is now out of stock", { icon: "⚠️" });
    }
  });

  useOfferSocket({
    crop_price_update: ({ cropId: updatedId, price }) => {
      if (updatedId === cropId) {
        setCrop((prev) => prev ? { ...prev, price } : prev);
        toast(`Price updated to ₹${price}`, { icon: "💰" });
      }
    },
  });

  const handleAddToCart = async (qty) => {
    setAddingCart(true);
    try {
      const data = await addCropToCart({ cropId, quantity: qty });
      setCart(data);
      queryClient.setQueryData(["cart"], data);
      toast.success(`${crop.cropName} added to cart`);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Failed to add to cart");
    } finally {
      setAddingCart(false);
    }
  };

  const handleBuyNow = async (qty) => {
    try {
      const data = await addCropToCart({ cropId, quantity: qty });
      setCart(data);
      queryClient.setQueryData(["cart"], data);
      navigate("/buyer/cart");
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Failed to proceed");
    }
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    toast.success("Link copied");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef]">
        <LoadingSkeleton />
      </div>
    );
  }

  if (!crop) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-slate-500 text-lg">Crop listing not found</p>
          <button onClick={() => navigate("/buyer/marketplace")}
            className="px-5 py-2.5 rounded-xl bg-green-700 text-white text-sm hover:bg-green-800 transition-all">
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  const images = [crop.image].filter(Boolean);
  const trendData = crop.trendData ?? [];
  const farmerData = farmer ?? crop.farmer;

  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "quality", label: "Quality" },
    { key: "price-history", label: "Price History" },
    { key: "reviews", label: "Reviews" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-8">

        {/* Breadcrumb */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => navigate("/buyer/marketplace")}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors">
              <ArrowLeft size={15} /> Marketplace
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600 truncate max-w-[180px] sm:max-w-xs">{crop.cropName}</span>
          </div>
          <div className="flex items-center gap-2">
            {crop.views != null && (
              <span className="hidden sm:flex items-center gap-1.5 text-slate-400 text-xs">
                <Eye size={12} /> {crop.views.toLocaleString()} views
              </span>
            )}
            <button onClick={handleShare}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-all shadow-sm">
              <Share2 size={15} />
            </button>
            <button
              onClick={() => {
                setWishlisted(!wishlisted);
                queryClient.invalidateQueries({ queryKey: ["dashboard-favorite-crops"] });
                toast(wishlisted ? "Removed from favorites" : "Added to favorites", {
                  icon: wishlisted ? "💔" : "❤️", duration: 2000,
                });
              }}
              className={`p-2 rounded-xl border transition-all shadow-sm ${
                wishlisted
                  ? "bg-red-50 border-red-200 text-red-500"
                  : "bg-white border-slate-200 text-slate-400 hover:text-slate-700"
              }`}>
              <Heart size={15} className={wishlisted ? "fill-red-400" : ""} />
            </button>
          </div>
        </div>

        {/* ── Main layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ── LEFT col (content) ── */}
          <div className="lg:col-span-8 space-y-5">

            {/* Gallery — full width, aspect-ratio driven, no fixed height */}
            <CropGallery images={images} cropName={crop.cropName} />

            {/* Crop info */}
            <CropInfo crop={crop} />

            {/* Farmer card */}
            <FarmerCard farmer={farmerData} crop={crop} onChat={() => setShowChat(true)} />

            {/* AI Insights */}
            {aiInsights && (
              <AIInsights insights={aiInsights} source={aiSource} cropName={crop.cropName} />
            )}

            {/* Action panel — mobile only (shown inline before tabs) */}
            <div className="lg:hidden">
              <ActionPanel
                crop={crop}
                onAddToCart={handleAddToCart}
                onBuyNow={handleBuyNow}
                onChat={() => setShowChat(true)}
                addingCart={addingCart}
              />
            </div>

            {/* Tabs */}
            <div>
              <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 mb-5 shadow-sm">
                {TABS.map((tab) => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                      activeTab === tab.key
                        ? "bg-green-700 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    }`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {(activeTab === "overview" || activeTab === "quality") && (
                  <motion.div key="quality" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <QualityMetrics crop={crop} />
                  </motion.div>
                )}
                {activeTab === "price-history" && (
                  <motion.div key="price-history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <PriceHistoryChart data={trendData} currentPrice={crop.price} />
                  </motion.div>
                )}
                {activeTab === "reviews" && (
                  <motion.div key="reviews" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <ReviewSection cropId={cropId} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Similar crops */}
            <SimilarCrops crops={similar} />
          </div>

          {/* ── RIGHT col (sticky sidebar) — desktop only ── */}
          <div className="hidden lg:block lg:col-span-4">
            <div className="sticky top-6 space-y-5">
              <ActionPanel
                crop={crop}
                onAddToCart={handleAddToCart}
                onBuyNow={handleBuyNow}
                onChat={() => setShowChat(true)}
                addingCart={addingCart}
              />

              {/* Trust badges */}
              <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Buyer Protection</p>
                <div className="space-y-2.5">
                  {[
                    "Verified farmer listing",
                    "Quality guaranteed or refund",
                    "Secure payment processing",
                    "AI-verified crop quality score",
                  ].map((text, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-slate-600 text-xs">
                      <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                        <span className="text-green-700 text-[9px] font-bold">✓</span>
                      </div>
                      {text}
                    </div>
                  ))}
                </div>
              </div>

              {/* Price chart in sidebar */}
              <PriceHistoryChart data={trendData} currentPrice={crop.price} />
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showChat && crop && (
          <ChatPanel crop={crop} onClose={() => setShowChat(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
