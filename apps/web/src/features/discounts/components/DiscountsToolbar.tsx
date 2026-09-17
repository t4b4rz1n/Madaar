import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SearchNormal1,
  Sort,
  Filter,
  ArrowUp2,
  ArrowDown2,
} from "iconsax-reactjs";
import { useSearchParams } from "react-router-dom";
import { useDebounce } from "../../../hooks/useDebounce";
import InputField from "../../../components/InputField";

interface ToolbarProps {
  onSearch: (query: string) => void;
  onSortChange: (sortKey: string) => void;
  onFilterChange: (filters: Record<string, string>) => void;
}

type SortKey = "code" | "percent" | "expiration_date" | "created_at";
type SortDirection = "asc" | "desc";

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "code", label: "Code" },
  { key: "percent", label: "Percent" },
  { key: "expiration_date", label: "Expiration Date" },
  { key: "created_at", label: "Date Created" },
];

export const DiscountsToolbar = ({
  onSearch,
  onSortChange,
  onFilterChange,
}: ToolbarProps) => {
  const [searchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("search") || "");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [codeFilter, setCodeFilter] = useState(() => searchParams.get("code__icontains") || "");
  const [minPercentage, setMinPercentage] = useState(() => searchParams.get("percent__gte") || "");
  const [maxPercentage, setMaxPercentage] = useState(() => searchParams.get("percent__lte") || "");
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get("is_active") || "");

  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    dir: SortDirection;
  }>(() => {
    const ordering = searchParams.get("ordering") || "";
    const isDesc = ordering.startsWith("-");
    const key = (isDesc ? ordering.slice(1) : ordering) as SortKey;
    return {
      key: sortOptions.some((opt) => opt.key === key) ? key : "created_at",
      dir: isDesc ? "desc" : "asc",
    };
  });

  const filterRef = useRef<HTMLDivElement>(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const debouncedCodeFilter = useDebounce(codeFilter, 500);
  const debouncedMinPercentage = useDebounce(minPercentage, 500);
  const debouncedMaxPercentage = useDebounce(maxPercentage, 500);

  // Keep references to callbacks updated
  const onSearchRef = useRef(onSearch);
  const onFilterChangeRef = useRef(onFilterChange);
  const onSortChangeRef = useRef(onSortChange);

  useEffect(() => {
    onSearchRef.current = onSearch;
    onFilterChangeRef.current = onFilterChange;
    onSortChangeRef.current = onSortChange;
  }, [onSearch, onFilterChange, onSortChange]);

  const isFirstSearch = useRef(true);
  useEffect(() => {
    if (isFirstSearch.current) {
      isFirstSearch.current = false;
      return;
    }
    onSearchRef.current(debouncedSearchQuery);
  }, [debouncedSearchQuery]);

  const isFirstFilter = useRef(true);
  useEffect(() => {
    if (isFirstFilter.current) {
      isFirstFilter.current = false;
      return;
    }
    onFilterChangeRef.current({
      code__icontains: debouncedCodeFilter,
      percent__gte: debouncedMinPercentage,
      percent__lte: debouncedMaxPercentage,
      is_active: statusFilter,
    });
  }, [
    debouncedCodeFilter,
    debouncedMinPercentage,
    debouncedMaxPercentage,
    statusFilter,
  ]);

  const isFirstSort = useRef(true);
  useEffect(() => {
    if (isFirstSort.current) {
      isFirstSort.current = false;
      return;
    }
    const sortPrefix = sortConfig.dir === "desc" ? "-" : "";
    onSortChangeRef.current(`${sortPrefix}${sortConfig.key}`);
  }, [sortConfig]);

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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeSortLabel = sortOptions.find(
    (opt) => opt.key === sortConfig.key
  )?.label;
  const buttonBaseClass =
    "btn btn-ghost rounded-xl hover:bg-primary/10 hover:text-primary border-none";
  const hasActiveFilters =
    codeFilter || minPercentage || maxPercentage || statusFilter;

  return (
    <div className="flex flex-col md:flex-row items-center gap-3 w-full p-2 bg-linear-to-r from-base-100 to-base-200/40 border-base-content/10 rounded-2xl">
      <div className="grow w-full">
        <InputField
          name="search"
          placeholder="Search discount codes..."
          icon={<SearchNormal1 size={18} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          classNameInput="!bg-transparent !shadow-none"
        />
      </div>
      <div className="flex items-center gap-1 border border-base-content/10 rounded-xl p-1">
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setIsFilterOpen((v) => !v)}
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
                className="absolute top-full left-0 z-10 p-4 shadow-lg bg-base-100 rounded-box w-80 mt-2 border border-base-content/10"
              >
                <div className="flex flex-col space-y-4">
                  <label className="form-control w-full">
                    <div className="label pb-1">
                      <span className="label-text text-xs font-semibold">
                        Filter by Code
                      </span>
                    </div>
                    <InputField
                      name="codeFilter"
                      placeholder="e.g., SUMMER"
                      value={codeFilter}
                      onChange={(e) => setCodeFilter(e.target.value)}
                      classNameInput="input-sm !shadow-none"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="form-control w-full">
                      <div className="label pb-1">
                        <span className="label-text text-xs font-semibold">
                          Min Percent
                        </span>
                      </div>
                      <InputField
                        type="number"
                        name="minPercentage"
                        placeholder="10"
                        value={minPercentage}
                        onChange={(e) => setMinPercentage(e.target.value)}
                        classNameInput="input-sm !shadow-none"
                      />
                    </label>
                    <label className="form-control w-full">
                      <div className="label pb-1">
                        <span className="label-text text-xs font-semibold">
                          Max Percent
                        </span>
                      </div>
                      <InputField
                        type="number"
                        name="maxPercentage"
                        placeholder="50"
                        value={maxPercentage}
                        onChange={(e) => setMaxPercentage(e.target.value)}
                        classNameInput="input-sm !shadow-none"
                      />
                    </label>
                  </div>

                  <label className="form-control w-full">
                    <div className="label pb-1">
                      <span className="label-text text-xs font-semibold">
                        Status
                      </span>
                    </div>
                    <select
                      className="select select-sm w-full !shadow-none"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="">All</option>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="dropdown dropdown-end">
          <button tabIndex={0} className={`${buttonBaseClass} flex-nowrap`}>
            <Sort size={18} />
            <span className="font-semibold mx-1 whitespace-nowrap">
              {activeSortLabel}
            </span>
          </button>
          <ul
            tabIndex={0}
            className="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-48 mt-2 border border-base-content/10"
          >
            {sortOptions.map((opt) => (
              <li
                key={opt.key}
                onClick={() =>
                  setSortConfig((prev) => ({ ...prev, key: opt.key }))
                }
              >
                <a className={sortConfig.key === opt.key ? "active" : ""}>
                  {opt.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <button
          onClick={() =>
            setSortConfig((prev) => ({
              ...prev,
              dir: prev.dir === "asc" ? "desc" : "asc",
            }))
          }
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
