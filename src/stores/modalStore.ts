import { create } from "zustand";

interface ModalState {
  showFloorPlanModal: boolean;
  showFacadeModal: boolean;
  setShowFloorPlanModal: (show: boolean) => void;
  setShowFacadeModal: (show: boolean) => void;
}

export const useModalStore = create<ModalState>((set) => ({
  showFloorPlanModal: false,
  showFacadeModal: false,
  setShowFloorPlanModal: (show) => set({ showFloorPlanModal: show }),
  setShowFacadeModal: (show) => set({ showFacadeModal: show }),
}));
