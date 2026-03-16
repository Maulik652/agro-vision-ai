import { create } from "zustand";
import { persist } from "zustand/middleware";

const normalizeNotification = (payload = {}) => ({
  id: String(payload.id || payload._id || `${Date.now()}_${Math.random()}`),
  type: String(payload.type || "system"),
  title: String(payload.title || "Dashboard Alert"),
  message: String(payload.message || "New dashboard update received."),
  priority: String(payload.priority || "normal"),
  read: Boolean(payload.read),
  createdAt: payload.createdAt || payload.emittedAt || new Date().toISOString()
});

export const useBuyerDashboardStore = create(
  persist(
    (set) => ({
      selectedCrop: "",
      selectedDays: 30,
      isSocketConnected: false,
      realtimeNotifications: [],
      setSelectedCrop: (crop) => set({ selectedCrop: String(crop || "") }),
      setSelectedDays: (days) => {
        const parsed = Number(days);
        const safeValue = [30, 60, 90].includes(parsed) ? parsed : 30;
        set({ selectedDays: safeValue });
      },
      setSocketConnected: (connected) => set({ isSocketConnected: Boolean(connected) }),
      pushRealtimeNotification: (payload) =>
        set((state) => {
          const incoming = normalizeNotification(payload);

          if (state.realtimeNotifications.some((row) => String(row.id) === incoming.id)) {
            return state;
          }

          return {
            realtimeNotifications: [incoming, ...state.realtimeNotifications].slice(0, 30)
          };
        }),
      clearRealtimeNotifications: () => set({ realtimeNotifications: [] })
    }),
    {
      name: "buyer-dashboard-store",
      partialize: (state) => ({
        selectedCrop: state.selectedCrop,
        selectedDays: state.selectedDays
      })
    }
  )
);