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
      className={`flex items-center gap-1 bg-base-100/60 backdrop-blur-sm border border-base-300 p-1 rounded-xl ${className}`}
    >
      <button
        onClick={() => setViewMode("grid")}
        className="relative z-10 btn btn-sm btn-ghost rounded-lg px-3 sm:px-4 flex-1"
      >
        {viewMode === "grid" && (
          <motion.div
            layoutId="active-view-indicator"
            className="absolute inset-0 bg-primary rounded-lg"
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          />
        )}
        <div
          className={`relative flex items-center justify-center w-full gap-2 transition-colors duration-300 ${
            viewMode === "grid"
              ? "text-primary-content"
              : "text-base-content/60"
          }`}
        >
          <Element3 size={18} />
          <span className="font-medium text-sm">Grid</span>
        </div>
      </button>

      <button
        onClick={() => setViewMode("table")}
        className="relative z-10 btn btn-sm btn-ghost rounded-lg px-3 sm:px-4 flex-1"
      >
        {viewMode === "table" && (
          <motion.div
            layoutId="active-view-indicator"
            className="absolute inset-0 bg-primary rounded-lg"
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          />
        )}
        <div
          className={`relative flex items-center justify-center w-full gap-2 transition-colors duration-300 ${
            viewMode === "table"
              ? "text-primary-content"
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
