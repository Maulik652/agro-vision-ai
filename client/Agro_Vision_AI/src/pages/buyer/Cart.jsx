/**
 * Cart Page — AgroVision AI
 * Multi-farmer cart with grouped items, full price breakdown,
 * delivery estimation, React Query caching, and Zustand state.
 */
import { useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShoppingCart, ArrowLeft, Trash2, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

import {
  fetchCart,
  addItemToCart,
  updateCartItem,
  removeCartItem,
  clearCartAPI,
  fetchDeliveryEstimate,
  fetchRecommendedCrops,
} from "../../services/cartAPI.js";
import useCartStore from "../../store/cartStore.js";

import CartList          from "../../components/cart/CartList.jsx";
import CartSummary       from "../../components/cart/CartSummary.jsx";
import CartSkeleton      from "../../components/cart/CartSkeleton.jsx";
import EmptyCart         from "../../components/cart/EmptyCart.jsx";
import RecommendedCrops  from "../../components/cart/RecommendedCrops.jsx";

/* ── Query keys ─────────────────────────────────────────────── */
const CART_KEY        = ["cart"];
const DELIVERY_KEY    = ["cart", "delivery"];
const RECOMMEND_KEY   = ["cart", "recommended"];

export default function Cart() {
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();
  const { setCart }  = useCartStore();

  /* ── Fetch cart ─────────────────────────────────────────── */
  const {
    data: cart,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: CART_KEY,
    queryFn:  fetchCart,
    staleTime: 0,
  });

  // Sync React Query data into Zustand store whenever it changes
  useEffect(() => {
    if (cart) setCart(cart);
  }, [cart, setCart]);

  /* ── Delivery estimate ──────────────────────────────────── */
  const { data: deliveryEstimate, isLoading: deliveryLoading } = useQuery({
    queryKey: DELIVERY_KEY,
    queryFn:  () => fetchDeliveryEstimate(),
    enabled:  (cart?.items?.length ?? 0) > 0,
    staleTime: 120_000,
  });

  /* ── Recommended crops ──────────────────────────────────── */
  const firstCategory = cart?.items?.[0]?.cropName?.split(" ")[0] ?? "";
  const { data: recommended, isLoading: recLoading } = useQuery({
    queryKey: [...RECOMMEND_KEY, firstCategory],
    queryFn:  () => fetchRecommendedCrops(firstCategory, 8),
    enabled:  true,
    staleTime: 300_000,
  });

  /* ── Mutations ──────────────────────────────────────────── */
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: CART_KEY });
    queryClient.invalidateQueries({ queryKey: DELIVERY_KEY });
  };

  const addMutation = useMutation({
    mutationFn: ({ cropId, quantity }) => addItemToCart(cropId, quantity),
    onSuccess: (data) => { setCart(data); invalidate(); toast.success("Added to cart"); },
    onError:   (err)  => toast.error(err?.response?.data?.message ?? "Failed to add item"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ cropId, quantity }) => updateCartItem(cropId, quantity),
    onSuccess: (data) => { setCart(data); invalidate(); },
    onError:   (err)  => toast.error(err?.response?.data?.message ?? "Failed to update quantity"),
  });

  const removeMutation = useMutation({
    mutationFn: (cropId) => removeCartItem(cropId),
    onSuccess: (data) => { setCart(data); invalidate(); toast.success("Item removed"); },
    onError:   ()     => toast.error("Failed to remove item"),
  });

  const clearMutation = useMutation({
    mutationFn: clearCartAPI,
    onSuccess: () => { setCart(null); invalidate(); toast.success("Cart cleared"); },
    onError:   ()  => toast.error("Failed to clear cart"),
  });

  /* ── Handlers (memoized) ────────────────────────────────── */
  const handleQtyChange = useCallback((cropId, quantity) => {
    if (quantity < 1) return;
    updateMutation.mutate({ cropId, quantity });
  }, [updateMutation]);

  const handleRemove = useCallback((cropId) => {
    removeMutation.mutate(cropId);
  }, [removeMutation]);

  const handleAddRecommended = useCallback((cropId, quantity = 1) => {
    return addMutation.mutateAsync({ cropId, quantity });
  }, [addMutation]);

  /* ── Derived state ──────────────────────────────────────── */
  const groupedByFarmer = useMemo(() => cart?.groupedByFarmer ?? [], [cart]);
  const hasItems        = (cart?.items?.length ?? 0) > 0;
  const actionBusy      = updateMutation.isPending || removeMutation.isPending;

  /* ── Loading state ──────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef]">
        <CartHeader itemCount={0} onClear={null} clearing={false} />
        <CartSkeleton />
      </div>
    );
  }

  /* ── Error state ────────────────────────────────────────── */
  if (isError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Failed to load cart</p>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-700 text-white text-sm font-semibold mx-auto"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef]">
      {/* Header */}
      <CartHeader
        itemCount={cart?.itemCount ?? 0}
        onClear={() => clearMutation.mutate()}
        clearing={clearMutation.isPending}
        hasItems={hasItems}
      />

      <div className="max-w-5xl mx-auto px-6 py-8">
        {!hasItems ? (
          <>
            <EmptyCart />
            <RecommendedCrops
              crops={recommended}
              onAdd={handleAddRecommended}
              isLoading={recLoading}
            />
          </>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left — cart items */}
            <div className="lg:col-span-2">
              <CartList
                groupedByFarmer={groupedByFarmer}
                onRemove={handleRemove}
                onQtyChange={handleQtyChange}
                disabled={actionBusy}
              />

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => navigate("/buyer/marketplace")}
                className="flex items-center gap-2 text-green-700 hover:text-green-800 text-sm transition-colors mt-5"
              >
                <ArrowLeft size={14} /> Continue Shopping
              </motion.button>

              {/* Recommended crops below items */}
              <RecommendedCrops
                crops={recommended}
                onAdd={handleAddRecommended}
                isLoading={recLoading}
              />
            </div>

            {/* Right — summary */}
            <div>
              <CartSummary
                cart={cart}
                deliveryEstimate={deliveryEstimate}
                deliveryLoading={deliveryLoading}
                onCheckout={() => navigate("/buyer/checkout")}
                checkoutDisabled={!hasItems || actionBusy}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sub-component: page header ─────────────────────────────── */
function CartHeader({ itemCount, onClear, clearing, hasItems }) {
  const navigate = useNavigate();
  return (
    <div className="border-b border-slate-100 bg-white shadow-sm">
      <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/buyer/marketplace")}
            aria-label="Back to marketplace"
            className="text-slate-400 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-slate-900 font-bold text-lg flex items-center gap-2">
              <ShoppingCart size={18} className="text-green-700" /> Shopping Cart
            </h1>
            <p className="text-slate-400 text-xs">
              {itemCount} item{itemCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {hasItems && (
          <button
            onClick={onClear}
            disabled={clearing}
            className="flex items-center gap-1.5 text-slate-400 hover:text-red-500 text-xs transition-colors disabled:opacity-50"
          >
            {clearing
              ? <RefreshCw size={12} className="animate-spin" />
              : <Trash2 size={12} />
            }
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
