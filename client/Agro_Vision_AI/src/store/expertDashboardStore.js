import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useExpertDashboardStore = create(
  persist(
    (set) => ({
      selectedCrop: "Wheat",
      selectedDays: 30,
      isSocketConnected: false,
      alerts: [],
      setSelectedCrop: (crop) => set({ selectedCrop: String(crop || "Wheat") }),
      setSelectedDays: (days) => {
        const parsed = Number(days);
        set({ selectedDays: [7, 14, 30, 60, 90].includes(parsed) ? parsed : 30 });
      },
      setSocketConnected: (v) => set({ isSocketConnected: Boolean(v) }),
      pushAlert: (alert) =>
        set((state) => ({
          alerts: [{ ...alert, id: `${Date.now()}_${Math.random()}`, ts: new Date().toISOString() }, ...state.alerts].slice(0, 50)
        })),
      clearAlerts: () => set({ alerts: [] })
    }),
    {
      name: "expert-dashboard-store",
      partialize: (s) => ({ selectedCrop: s.selectedCrop, selectedDays: s.selectedDays })
    }
  )
);
