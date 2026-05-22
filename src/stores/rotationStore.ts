import { create } from "zustand";

interface RotationState {
  manualRotation: number;
  pendingRotation: number | null;
  isCalculating: boolean;
  setManualRotation: (rotation: number) => void;
  setPendingRotation: (rotation: number | null) => void;
  applyPendingRotation: () => void;
  setIsCalculating: (calculating: boolean) => void;
}

export const useRotationStore = create<RotationState>((set, get) => ({
  manualRotation: 0,
  pendingRotation: null,
  isCalculating: false,
  setManualRotation: (rotation: number) =>
    set({ manualRotation: rotation, pendingRotation: null }),
  setPendingRotation: (rotation: number | null) =>
    set({ pendingRotation: rotation }),
  applyPendingRotation: () => {
    const { pendingRotation } = get();
    if (pendingRotation !== null) {
      set({ manualRotation: pendingRotation, pendingRotation: null });
    }
  },
  setIsCalculating: (calculating: boolean) =>
    set({ isCalculating: calculating }),
}));
