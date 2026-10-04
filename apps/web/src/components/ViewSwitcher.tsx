import { t as translate, useTranslation } from "../i18n/locale";
import { motion } from "motion/react";
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
  { id: "grid", get label() { return translate("Grid"); }, icon: Element3 },
  { id: "table", get label() { return translate("Table"); }, icon: RowVertical },
  { id: "orbit", get label() { return translate("Orbit"); }, icon: Discover },
];

export const ViewSwitcher = <T extends ViewMode>({
  viewMode,
  setViewMode,
  modes = ["grid", "table"],
  className = "",
}: ViewSwitcherProps<T>) => {
  const t = useTranslation();
  return (
    <div
      className={`flex items-center p-1 bg-heledone-brand-soft border border-heledone-border rounded-xl ${className}`}
      role="group"
      aria-label={t("Choose view")}
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
              aria-label={t("{value0} view", { value0: option.label })}
            >
              {isActive && (
                <motion.div
                  layoutId="active-view-indicator"
                  className="absolute inset-0 bg-base-100 shadow-sm rounded-lg"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}
              <div
                className={`relative flex items-center justify-center w-full gap-2 transition-colors duration-300 ${
                  isActive ? "text-primary" : "text-heledone-ink-muted"
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
