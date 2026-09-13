import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Expanded sidebar default: the previous 16.5rem token minus 5px at a 16px root font size. */
export const SIDEBAR_DEFAULT_WIDTH = 259;
/** Icon-only rail width (previous 4.25rem token). */
export const SIDEBAR_COLLAPSED_WIDTH = 68;
export const SIDEBAR_MIN_WIDTH = 200;
export const SIDEBAR_MAX_WIDTH = 380;

const clampWidth = (width: number) =>
  Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(width)));

interface LayoutState {
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
  /** Expanded sidebar width in pixels — user adjustable via the resize handle. */
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  resetSidebarWidth: () => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      isSidebarOpen: false,
      setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
      isCollapsed: false,
      setIsCollapsed: (isCollapsed) => set({ isCollapsed }),
      sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
      setSidebarWidth: (width) => set({ sidebarWidth: clampWidth(width) }),
      resetSidebarWidth: () => set({ sidebarWidth: SIDEBAR_DEFAULT_WIDTH }),
    }),
    {
      name: "layout-store",
      partialize: (state) => ({ sidebarWidth: state.sidebarWidth }),
    }
  )
);
