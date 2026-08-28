import { motion } from "framer-motion";
import { Element3, RowVertical } from "iconsax-reactjs";

type ViewMode = "table" | "grid";

interface ViewSwitcherProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  className?: string;
}

export const ViewSwitcher = ({
  viewMode,
  setViewMode,
  className = "",
}: ViewSwitcherProps) => {
  return (
    <div
      className={`flex items-center p-0.5 bg-base-200/40 backdrop-blur-md border border-base-content/8 rounded-lg ${className}`}
    >
      <button
        onClick={() => setViewMode("grid")}
        className="relative z-10 btn btn-sm btn-ghost rounded-md px-2.5 sm:px-3 flex-1 h-7 min-h-0 active:scale-95 transition-transform duration-100 ease-out"
      >
        {viewMode === "grid" && (
          <motion.div
            layoutId="active-view-indicator"
            className="absolute inset-0 bg-base-100 shadow-sm rounded-md"
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          />
        )}
        <div
          className={`relative flex items-center justify-center w-full gap-2 transition-colors duration-300 ${
            viewMode === "grid"
              ? "text-base-content"
              : "text-base-content/60"
          }`}
        >
          <Element3 size={18} />
          <span className="font-medium text-sm">Grid</span>
        </div>
      </button>

      <button
        onClick={() => setViewMode("table")}
        className="relative z-10 btn btn-sm btn-ghost rounded-md px-2.5 sm:px-3 flex-1 h-7 min-h-0 active:scale-95 transition-transform duration-100 ease-out"
      >
        {viewMode === "table" && (
          <motion.div
            layoutId="active-view-indicator"
            className="absolute inset-0 bg-base-100 shadow-sm rounded-md"
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          />
        )}
        <div
          className={`relative flex items-center justify-center w-full gap-2 transition-colors duration-300 ${
            viewMode === "table"
              ? "text-base-content"
              : "text-base-content/60"
          }`}
        >
          <RowVertical size={18} />
          <span className="font-medium text-sm">Table</span>
        </div>
      </button>
    </div>
  );
};
