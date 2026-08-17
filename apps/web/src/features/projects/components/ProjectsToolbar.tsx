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

type SortKey = "title" | "end_date" | "progress_percentage" | "created_at";
type SortDirection = "asc" | "desc";

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "created_at", label: "Date Created" },
  { key: "title", label: "Project Title" },
  { key: "end_date", label: "Due Date" },
  { key: "progress_percentage", label: "Progress" },
];

export const ProjectsToolbar = ({
  onSearch,
  onSortChange,
  onFilterChange,
}: ToolbarProps) => {
  const [searchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get("search") || "",
  );
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const statusFilter = searchParams.get("status") || "";

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

  useEffect(() => {
    setSearchQuery(searchParams.get("search") || "");
  }, [searchParams]);

  const isFirstSearch = useRef(true);
  useEffect(() => {
    if (isFirstSearch.current) {
      isFirstSearch.current = false;
      return;
    }
    onSearchRef.current(debouncedSearchQuery);
  }, [debouncedSearchQuery]);

  const handleStatusFilterChange = (value: string) => {
    onFilterChange({
      status: value,
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
    "btn btn-ghost rounded-xl hover:bg-primary/10 hover:text-primary border-none text-xs font-semibold";

  const hasActiveFilters = Boolean(statusFilter);

  return (
    <div className="madaar-surface flex w-full flex-col items-center gap-3 rounded-2xl border border-base-content/10 bg-base-100 p-2 md:flex-row">
      <div className="grow w-full">
        <InputField
          name="search"
          placeholder="Search projects..."
          icon={<SearchNormal1 size={18} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          classNameInput="!bg-transparent !shadow-none"
        />
      </div>

      <div className="flex w-full items-center justify-between gap-1 rounded-xl border border-base-content/10 p-1 sm:w-auto sm:justify-start">
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
                className="madaar-surface absolute right-0 top-full z-20 mt-2 w-72 rounded-2xl border border-base-content/10 bg-base-100 p-4 shadow-xl md:left-0 md:right-auto"
              >
                <div className="flex flex-col space-y-4">
                  <label className="form-control w-full">
                    <div className="label pb-1">
                      <span className="label-text text-xs font-semibold text-base-content">
                        Status
                      </span>
                    </div>
                    <select
                      className="select select-bordered select-sm w-full rounded-xl bg-base-200/60"
                      value={statusFilter}
                      onChange={(e) => handleStatusFilterChange(e.target.value)}
                    >
                      <option value="">All Statuses</option>
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="on_hold">On Hold</option>
                      <option value="completed">Completed</option>
                      <option value="archived">Archived</option>
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
            aria-label={`Sort projects by ${activeSortLabel}`}
          >
            <Sort size={18} />
            <span className="mx-1 hidden whitespace-nowrap font-semibold sm:inline">
              {activeSortLabel}
            </span>
          </button>

          <ul
            tabIndex={0}
            className="dropdown-content madaar-surface z-20 mt-2 w-48 rounded-2xl border border-base-content/10 bg-base-100 p-2 shadow-xl menu text-xs"
          >
            {sortOptions.map((opt) => (
              <li key={opt.key} onClick={() => handleSortKeyChange(opt.key)}>
                <a
                  className={
                    sortConfig.key === opt.key
                      ? "font-bold text-primary active"
                      : "text-base-content"
                  }
                >
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
          aria-label={`Sort ${
            sortConfig.dir === "asc" ? "descending" : "ascending"
          }`}
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
