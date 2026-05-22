import { create } from "zustand";

interface UIState {
  hideRotationControls: boolean;
  setHideRotationControls: (hide: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  hideRotationControls: false,
  setHideRotationControls: (hide: boolean) =>
    set({ hideRotationControls: hide }),
}));
