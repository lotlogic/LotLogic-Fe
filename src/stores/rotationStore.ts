import { create } from 'zustand';

interface RotationState {
  manualRotation: number;
  setManualRotation: (rotation: number) => void;
}

export const useRotationStore = create<RotationState>((set) => ({
  manualRotation: 0,
  setManualRotation: (rotation: number) => set({ manualRotation: rotation }),
}));
