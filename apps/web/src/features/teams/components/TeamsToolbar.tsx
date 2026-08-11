import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown2,
  ArrowUp2,
  Filter,
  SearchNormal1,
  Sort,
} from "iconsax-reactjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import InputField from "../../../components/InputField";
import { useDebounce } from "../../../hooks/useDebounce";

interface ToolbarProps {
  onSearch: (query: string) => void;
  onSortChange: (sortKey: string) => void;
  onFilterChange: (filters: Record<string, string>) => void;
}

type SortKey = "name" | "created_at";
type SortDirection = "asc" | "desc";

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "name", label: "Team Name" },
  { key: "created_at", label: "Date Created" },
];

export const TeamsToolbar = ({
  onSearch,
  onSortChange,
  onFilterChange,
}: ToolbarProps) => {
  const [searchParams] = useSearchParams();

  // استیت محلی فیلد جست‌وجو برای اعمال Debounce
  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get("search") || "",
  );
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // سینک فیلترها با URL (تک‌منبع حقیقت)
  const activeFilter = searchParams.get("is_active") || "";

  // محاسبه سورت از روی URL
  const sortConfig = useMemo<{ key: SortKey; dir: SortDirection }>(() => {
    const ordering = searchParams.get("ordering") || "";
    const isDesc = ordering.startsWith("-");
    const key = (isDesc ? ordering.slice(1) : ordering) as SortKey;

    return {
      key: sortOptions.some((opt) => opt.key === key) ? key : "created_at",
      dir: isDesc ? "desc" : "asc",
    };
  }, [searchParams]);

  const filterRef = useRef<HTMLDivElement>(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const onSearchRef = useRef(onSearch);
  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  // همگام‌سازی استیت سرچ متنی
  useEffect(() => {
    setSearchQuery(searchParams.get("search") || "");
  }, [searchParams]);

  // اعمال دبانس سرچ
  const isFirstSearch = useRef(true);
  useEffect(() => {
    if (isFirstSearch.current) {
      isFirstSearch.current = false;
      return;
    }
    onSearchRef.current(debouncedSearchQuery);
  }, [debouncedSearchQuery]);

  const handleActiveFilterChange = (value: string) => {
    onFilterChange({
      is_active: value,
    });
  };

  const handleSortKeyChange = (key: SortKey) => {
    const sortPrefix = sortConfig.dir === "desc" ? "-" : "";
    onSortChange(`${sortPrefix}${key}`);
  };

  const toggleSortDirection = () => {
    const nextDir = sortConfig.dir === "asc" ? "desc" : "asc";
    const sortPrefix = nextDir === "desc" ? "-" : "";
    onSortChange(`${sortPrefix}${sortConfig.key}`);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setIsFilterOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const activeSortLabel = sortOptions.find(
    (opt) => opt.key === sortConfig.key,
  )?.label;

  const buttonBaseClass =
    "btn btn-ghost rounded-xl hover:bg-primary/10 hover:text-primary border-none";

  const hasActiveFilters = Boolean(activeFilter);

  return (
    <div className="flex w-full flex-col items-center gap-3 rounded-2xl border border-base-content/10 bg-linear-to-r from-base-100 to-base-200/40 p-2 md:flex-row">
      <div className="grow w-full">
        <InputField
          name="search"
          placeholder="Search teams..."
          icon={<SearchNormal1 size={18} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          classNameInput="!bg-transparent !shadow-none"
        />
      </div>

      <div className="flex items-center gap-1 rounded-xl border border-base-content/10 p-1">
        <div className="relative" ref={filterRef}>
          <button
            type="button"
            onClick={() => setIsFilterOpen((prev) => !prev)}
            className={`${buttonBaseClass} ${
              isFilterOpen || hasActiveFilters
                ? "bg-primary/10 text-primary"
                : ""
            }`}
          >
            <Filter size={18} />
            <span className="hidden sm:inline">Filter</span>
          </button>

          <AnimatePresence>
            {isFilterOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="absolute left-0 top-full z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-box border border-base-content/10 bg-base-100 p-4 shadow-lg"
              >
                <div className="flex flex-col space-y-4">
                  <label className="form-control w-full">
                    <div className="label pb-1">
                      <span className="label-text text-xs font-semibold">
                        Status
                      </span>
                    </div>
                    <select
                      className="select select-sm w-full border-base-300 !shadow-none"
                      value={activeFilter}
                      onChange={(e) => handleActiveFilterChange(e.target.value)}
                    >
                      <option value="">All Teams</option>
                      <option value="true">Active Only</option>
                      <option value="false">Inactive Only</option>
                    </select>
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="dropdown dropdown-end">
          <button
            type="button"
            tabIndex={0}
            className={`${buttonBaseClass} flex-nowrap`}
          >
            <Sort size={18} />
            <span className="mx-1 whitespace-nowrap font-semibold">
              {activeSortLabel}
            </span>
          </button>

          <ul
            tabIndex={0}
            className="dropdown-content z-[1] mt-2 w-48 rounded-box border border-base-content/10 bg-base-100 p-2 shadow-lg menu"
          >
            {sortOptions.map((opt) => (
              <li key={opt.key} onClick={() => handleSortKeyChange(opt.key)}>
                <a className={sortConfig.key === opt.key ? "active" : ""}>
                  {opt.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={toggleSortDirection}
          className={`${buttonBaseClass} btn-circle`}
        >
          {sortConfig.dir === "asc" ? (
            <ArrowUp2 size={18} />
          ) : (
            <ArrowDown2 size={18} />
          )}
        </button>
      </div>
    </div>
  );
};
