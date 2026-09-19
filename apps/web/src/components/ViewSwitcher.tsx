import { motion } from "framer-motion";
import { Discover, Element3, RowVertical } from "iconsax-reactjs";
import type { ViewMode } from "../features/projects/types";

interface ViewSwitcherProps<T extends ViewMode> {
  viewMode: T;
  setViewMode: (mode: T) => void;
  modes?: readonly ViewMode[];
  className?: string;
}

const viewOptions: Array<{
  id: ViewMode;
  label: string;
  icon: typeof Element3;
}> = [
  { id: "grid", label: "Grid", icon: Element3 },
  { id: "table", label: "Table", icon: RowVertical },
  { id: "orbit", label: "Orbit", icon: Discover },
];

export const ViewSwitcher = <T extends ViewMode>({
  viewMode,
  setViewMode,
  modes = ["grid", "table"],
  className = "",
}: ViewSwitcherProps<T>) => {
  return (
    <div
      className={`flex items-center p-0.5 bg-base-200/40 backdrop-blur-md border border-base-content/8 rounded-lg ${className}`}
      role="group"
      aria-label="Choose view"
    >
      {viewOptions
        .filter((option) => modes.includes(option.id))
        .map((option) => {
          const Icon = option.icon;
          const isActive = viewMode === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setViewMode(option.id as T)}
              className="relative z-10 btn btn-sm btn-ghost rounded-md px-2.5 sm:px-3 flex-1 h-7 min-h-0 active:scale-95 transition-transform duration-100 ease-out"
              aria-pressed={isActive}
              aria-label={`${option.label} view`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-view-indicator"
                  className="absolute inset-0 bg-base-100 shadow-sm rounded-md"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}
              <div
                className={`relative flex items-center justify-center w-full gap-2 transition-colors duration-300 ${
                  isActive ? "text-base-content" : "text-base-content/60"
                }`}
              >
                <Icon size={18} />
                <span className="font-medium text-sm">{option.label}</span>
              </div>
            </button>
          );
        })}
    </div>
  );
};
