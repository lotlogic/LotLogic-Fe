import { create } from "zustand";

export type MobileTab = "search" | "saved" | "recenter" | null;

interface MobileNavigationState {
  activeTab: MobileTab;
  setActiveTab: (tab: MobileTab) => void;

  // Actions
  toggleTab: (tab: "search" | "saved" | "recenter") => void;
  closeAllPanels: () => void;

  // Callback to clear selected lot (set by MapLayer component)
  clearSelectedLotCallback: (() => void) | null;
  setClearSelectedLotCallback: (callback: (() => void) | null) => void;
}

export const useMobileNavigationStore = create<MobileNavigationState>(
  (set, get) => ({
    activeTab: null,
    setActiveTab: (tab) => set({ activeTab: tab }),

    // Callback to clear selected lot
    clearSelectedLotCallback: null,
    setClearSelectedLotCallback: (callback) =>
      set({ clearSelectedLotCallback: callback }),

    toggleTab: (tab) => {
      const { activeTab, clearSelectedLotCallback } = get();

      // If clicking the same tab that's already active, dehighlight it
      if (activeTab === tab) {
        set({ activeTab: null });
        return;
      }

      // Otherwise, select the new tab
      set({ activeTab: tab });

      // Clear selected lot when switching to navigation tabs
      if (clearSelectedLotCallback) {
        clearSelectedLotCallback();
      }

      // Handle special tab actions
      if (tab === "recenter") {
        // Dispatch recenter event for map
        window.dispatchEvent(new CustomEvent("recenter-map"));
      }
    },

    closeAllPanels: () => set({ activeTab: null }),
  })
);
