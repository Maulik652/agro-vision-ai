import { useEffect, useMemo } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  addMarketplaceItemToCart,
  fetchMarketplaceAIInsights,
  fetchMarketplaceCategories,
  fetchMarketplaceCrops
} from "../../api/marketplaceApi";
import AIInsightsPanel from "../../components/marketplace/AIInsightsPanel";
import CropGrid from "../../components/marketplace/CropGrid";
import MarketplaceFilters from "../../components/marketplace/MarketplaceFilters";
import MarketplaceHeader from "../../components/marketplace/MarketplaceHeader";
import PaginationControls from "../../components/marketplace/PaginationControls";
import { connectMarketplaceSocket } from "../../realtime/marketplaceSocket";
import { useMarketplaceStore } from "../../store/marketplaceStore";

const PAGE_SIZE = 12;

const normalizeCropFromSocket = (payload = {}) => {
  const source = payload.listing || payload.crop || payload;

  const location = source.location || {};
  const city = String(location.city || source.city || "").trim();
  const state = String(location.state || source.state || "").trim();

  return {
    id: String(source.id || source._id || ""),
    cropName: source.cropName || "Crop",
    category: source.category || source.cropName || "General",
    pricePerKg: Number(source.pricePerKg ?? source.price ?? 0),
    quantityAvailable: Number(source.quantityAvailable ?? source.quantity ?? 0),
    harvestDate: source.harvestDate || source.createdAt || null,
    moistureLevel: Number(source.moistureLevel ?? source.moisturePercent ?? 0),
    qualityGrade: String(source.qualityGrade || source.grade || "B"),
    organicCertified: Boolean(source.organicCertified || source.qualityType === "organic"),
    images: Array.isArray(source.images) ? source.images : [source.image].filter(Boolean),
    aiDemandScore: Number(source.aiDemandScore ?? source.aiConfidence ?? 0.65),
    location: { city, state },
    farmer: {
      id: String(source.farmer?.id || source.farmer?._id || source.farmerId || ""),
      name: source.farmer?.name || "Farmer",
      rating: Number(source.farmer?.rating ?? 4.5),
      farmLocation: source.farmer?.farmLocation || [city, state].filter(Boolean).join(", "),
      certifications: Array.isArray(source.farmer?.certifications) ? source.farmer.certifications : []
    }
  };
};

const Marketplace = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    filters,
    selectedCategoryForInsights,
    setFilter,
    setFilters,
    resetFilters,
    setSelectedCategoryForInsights
  } = useMarketplaceStore();

  const categoriesQuery = useQuery({
    queryKey: ["marketplace-categories"],
    queryFn: fetchMarketplaceCategories,
    staleTime: 5 * 60 * 1000
  });

  const cropsQuery = useInfiniteQuery({
    queryKey: ["marketplace-crops", filters],
    initialPageParam: 1,
    queryFn: ({ pageParam = 1 }) =>
      fetchMarketplaceCrops({
        ...filters,
        page: pageParam,
        limit: PAGE_SIZE
      }),
    getNextPageParam: (lastPage) => {
      const pagination = lastPage?.pagination;
      if (!pagination?.hasMore) {
        return undefined;
      }

      return Number(pagination.currentPage) + 1;
    },
    staleTime: 45_000
  });

  const crops = useMemo(
    () =>
      (cropsQuery.data?.pages || []).flatMap((page) =>
        Array.isArray(page?.crops) ? page.crops : []
      ),
    [cropsQuery.data?.pages]
  );

  const latestPagination =
    cropsQuery.data?.pages?.[cropsQuery.data.pages.length - 1]?.pagination || {
      currentPage: 1,
      totalPages: 1,
      totalItems: crops.length,
      pageSize: PAGE_SIZE,
      hasMore: false
    };

  const selectedInsightKey =
    selectedCategoryForInsights
    || (filters.category && filters.category !== "all" ? filters.category : "")
    || crops[0]?.category
    || "wheat";

  const aiInsightsQuery = useQuery({
    queryKey: ["marketplace-ai-insights", selectedInsightKey],
    queryFn: () => fetchMarketplaceAIInsights(selectedInsightKey),
    enabled: Boolean(selectedInsightKey),
    staleTime: 60_000
  });

  const addToCartMutation = useMutation({
    mutationFn: addMarketplaceItemToCart,
    onSuccess: (response) => {
      toast.success(response?.message || "Added to cart");
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Unable to add item to cart");
    }
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      return undefined;
    }

    const socket = connectMarketplaceSocket(token);

    const handleNewCrop = (payload = {}) => {
      const realtimeCrop = normalizeCropFromSocket(payload);
      if (!realtimeCrop.id) {
        return;
      }

      queryClient.setQueriesData({ queryKey: ["marketplace-crops"] }, (existing) => {
        if (!existing?.pages?.length) {
          return existing;
        }

        const firstPage = existing.pages[0];
        const firstPageCrops = Array.isArray(firstPage?.crops) ? firstPage.crops : [];
        if (firstPageCrops.some((row) => String(row.id) === realtimeCrop.id)) {
          return existing;
        }

        const nextFirstPage = {
          ...firstPage,
          crops: [realtimeCrop, ...firstPageCrops].slice(0, PAGE_SIZE)
        };

        return {
          ...existing,
          pages: [nextFirstPage, ...existing.pages.slice(1)]
        };
      });
    };

    const handlePriceUpdate = (payload = {}) => {
      const targetCropId = String(payload.cropId || "");
      const nextPrice = Number(payload.priceData?.pricePerKg ?? payload.priceData?.price ?? NaN);

      if (!targetCropId || !Number.isFinite(nextPrice)) {
        return;
      }

      queryClient.setQueriesData({ queryKey: ["marketplace-crops"] }, (existing) => {
        if (!existing?.pages?.length) {
          return existing;
        }

        return {
          ...existing,
          pages: existing.pages.map((page) => ({
            ...page,
            crops: (page?.crops || []).map((crop) =>
              String(crop.id) === targetCropId
                ? { ...crop, pricePerKg: nextPrice }
                : crop
            )
          }))
        };
      });
    };

    socket.on("new_crop_listing", handleNewCrop);
    socket.on("crop_price_update", handlePriceUpdate);

    return () => {
      socket.off("new_crop_listing", handleNewCrop);
      socket.off("crop_price_update", handlePriceUpdate);
      socket.disconnect();
    };
  }, [queryClient]);

  const categoryOptions = useMemo(() => {
    const rows = Array.isArray(categoriesQuery.data?.categories)
      ? categoriesQuery.data.categories
      : [];

    return [
      { value: "all", label: "All Categories" },
      ...rows.map((row) => ({ value: row.name, label: `${row.name} (${row.count})` }))
    ];
  }, [categoriesQuery.data?.categories]);

  const locationOptions = useMemo(() => {
    const fromCrops = crops
      .map((crop) => [crop.location?.city, crop.location?.state].filter(Boolean).join(", "))
      .filter(Boolean);
    return Array.from(new Set(fromCrops)).slice(0, 20);
  }, [crops]);

  const isInitialLoading = cropsQuery.isLoading;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f3fff4,#fbfffb)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <MarketplaceHeader
          search={filters.search}
          onSearchChange={(value) => setFilter("search", value)}
          category={filters.category}
          onCategoryChange={(value) => {
            setFilters({ category: value, page: 1 });
            setSelectedCategoryForInsights(value === "all" ? "" : value);
          }}
          location={filters.location}
          onLocationChange={(value) => setFilter("location", value)}
          sort={filters.sort}
          onSortChange={(value) => setFilter("sort", value)}
          categoryOptions={categoryOptions}
          locationOptions={locationOptions}
        />

        <MarketplaceFilters
          filters={filters}
          onChange={setFilter}
          onReset={resetFilters}
          categoryOptions={categoryOptions}
          locationOptions={locationOptions}
        />

        <div className="grid gap-4 xl:grid-cols-[1fr,320px]">
          <section className="space-y-4">
            <CropGrid
              crops={crops}
              isLoading={isInitialLoading}
              isFetchingNextPage={cropsQuery.isFetchingNextPage}
              onViewDetails={(crop) => navigate(`/marketplace/crop/${crop.id}`)}
              onChatFarmer={(crop) => navigate(`/marketplace/crop/${crop.id}`)}
              onAddToCart={(crop) => {
                addToCartMutation.mutate({
                  cropId: crop.id,
                  farmerId: crop.farmer?.id,
                  quantity: 1,
                  note: ""
                });
              }}
              addingCropId={addToCartMutation.variables?.cropId || ""}
              isAdding={addToCartMutation.isPending}
            />

            <PaginationControls
              pageInfo={latestPagination}
              onLoadMore={() => cropsQuery.fetchNextPage()}
              isLoadingMore={cropsQuery.isFetchingNextPage}
              canLoadMore={Boolean(cropsQuery.hasNextPage)}
            />
          </section>

          <AIInsightsPanel
            category={selectedInsightKey}
            data={aiInsightsQuery.data?.insights || null}
            source={aiInsightsQuery.data?.source || "fallback"}
            isLoading={aiInsightsQuery.isLoading}
            suggestedCrops={aiInsightsQuery.data?.suggestedCrops || []}
          />
        </div>
      </div>
    </main>
  );
};

export default Marketplace;
