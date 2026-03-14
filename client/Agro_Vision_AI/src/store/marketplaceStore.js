import { create } from "zustand";
import { persist } from "zustand/middleware";

const defaultFilters = {
  search: "",
  category: "all",
  location: "",
  sort: "ai_recommended",
  minPrice: "",
  maxPrice: "",
  organic: "all",
  harvestFrom: "",
  harvestTo: "",
  minRating: "",
  minQuantity: ""
};

export const useMarketplaceStore = create(
  persist(
    (set) => ({
      filters: defaultFilters,
      selectedCategoryForInsights: "",
      setFilter: (key, value) =>
        set((state) => ({
          filters: {
            ...state.filters,
            [key]: value
          }
        })),
      setFilters: (payload) =>
        set((state) => ({
          filters: {
            ...state.filters,
            ...payload
          }
        })),
      resetFilters: () => set({ filters: defaultFilters }),
      setSelectedCategoryForInsights: (value) => set({ selectedCategoryForInsights: String(value || "") })
    }),
    {
      name: "marketplace-filters-store",
      partialize: (state) => ({
        filters: state.filters,
        selectedCategoryForInsights: state.selectedCategoryForInsights
      })
    }
  )
);
