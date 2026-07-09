import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown2,
  ArrowUp2,
  Filter,
  SearchNormal1,
  Sort,
} from "iconsax-reactjs";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import InputField from "../../../components/InputField";
import { useDebounce } from "../../../hooks/useDebounce";

interface ToolbarProps {
  onSearch: (query: string) => void;
  onSortChange: (sortKey: string) => void;
  onFilterChange: (filters: Record<string, string>) => void;
}

type SortKey = "username" | "email" | "date_joined";
type SortDirection = "asc" | "desc";

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "username", label: "Username" },
  { key: "email", label: "Email" },
  { key: "date_joined", label: "Date Joined" },
];

export const UsersToolbar = ({
  onSearch,
  onSortChange,
  onFilterChange,
}: ToolbarProps) => {
  const [searchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("search") || "");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Filters
  const [activeFilter, setActiveFilter] = useState(() => searchParams.get("is_active") || "");
  const [staffFilter, setStaffFilter] = useState(() => searchParams.get("is_staff") || "");

  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    dir: SortDirection;
  }>(() => {
    const ordering = searchParams.get("ordering") || "";
    const isDesc = ordering.startsWith("-");
    const key = (isDesc ? ordering.slice(1) : ordering) as SortKey;
    return {
      key: sortOptions.some((opt) => opt.key === key) ? key : "date_joined",
      dir: isDesc ? "desc" : "asc",
    };
  });

  const filterRef = useRef<HTMLDivElement>(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

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
      is_active: activeFilter,
      is_staff: staffFilter,
    });
  }, [activeFilter, staffFilter]);

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

  const hasActiveFilters = activeFilter || staffFilter;

  return (
    <div className="flex flex-col md:flex-row items-center gap-3 w-full p-2 bg-linear-to-r from-base-100 to-base-200/40 border-base-content/10 rounded-2xl">
      <div className="grow w-full">
        <InputField
          name="search"
          placeholder="Search users..."
          icon={<SearchNormal1 size={18} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          classNameInput="!bg-transparent !shadow-none"
        />
      </div>

      <div className="flex items-center gap-1 border border-base-content/10 rounded-xl p-1">
        {/* Filter Dropdown */}
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
                className="absolute top-full right-0 md:left-0 z-10 p-4 shadow-lg bg-base-100 rounded-box w-72 mt-2 border border-base-content/10"
              >
                <div className="flex flex-col space-y-4">
                  <label className="form-control w-full">
                    <div className="label pb-1">
                      <span className="label-text text-xs font-semibold">
                        Status
                      </span>
                    </div>
                    <select
                      className="select select-sm w-full !shadow-none border-base-300"
                      value={activeFilter}
                      onChange={(e) => setActiveFilter(e.target.value)}
                    >
                      <option value="">All Users</option>
                      <option value="true">Active Only</option>
                      <option value="false">Inactive Only</option>
                    </select>
                  </label>

                  <label className="form-control w-full">
                    <div className="label pb-1">
                      <span className="label-text text-xs font-semibold">
                        Role
                      </span>
                    </div>
                    <select
                      className="select select-sm w-full !shadow-none border-base-300"
                      value={staffFilter}
                      onChange={(e) => setStaffFilter(e.target.value)}
                    >
                      <option value="">All Roles</option>
                      <option value="true">Staff Only</option>
                      <option value="false">Regular Users</option>
                    </select>
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sort Dropdown */}
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

        {/* Sort Direction Toggle */}
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
