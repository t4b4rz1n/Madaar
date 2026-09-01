import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown2,
  ArrowUp2,
  Building3,
  Filter,
  SearchNormal1,
  Sort,
} from "iconsax-reactjs";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import InputField from "../../../components/InputField";
import { useDebounce } from "../../../hooks/useDebounce";

interface ToolbarProps {
  onSearch: (query: string) => void;
  onSortChange: (sortKey: string) => void;
  onFilterChange: (filters: Record<string, string>) => void;
  organizations?: Array<{ id: string | number; name: string }>;
  currentOrganizationId?: string;
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
  organizations,
  currentOrganizationId = "",
}: ToolbarProps) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // استیت محلی فیلد جست‌وجو برای اعمال Debounce
  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get("search") || "",
  );
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [filterPopoverPosition, setFilterPopoverPosition] = useState({
    top: 0,
    left: 0,
  });
  const [sortPopoverPosition, setSortPopoverPosition] = useState({
    top: 0,
    left: 0,
  });

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
  const filterPopoverRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const sortPopoverRef = useRef<HTMLDivElement>(null);
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

  const handleOrganizationChange = (value: string) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set("organization_id", value);
      return newParams;
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
    const updateFilterPopoverPosition = () => {
      if (!filterRef.current) return;

      const triggerRect = filterRef.current.getBoundingClientRect();
      const popoverWidth = 288;
      const viewportPadding = 16;

      setFilterPopoverPosition({
        top: triggerRect.bottom + 8,
        left: Math.max(
          viewportPadding,
          Math.min(
            triggerRect.right - popoverWidth,
            window.innerWidth - popoverWidth - viewportPadding,
          ),
        ),
      });
    };

    if (isFilterOpen) {
      updateFilterPopoverPosition();
      window.addEventListener("resize", updateFilterPopoverPosition);
      window.addEventListener("scroll", updateFilterPopoverPosition, true);
    }

    return () => {
      window.removeEventListener("resize", updateFilterPopoverPosition);
      window.removeEventListener("scroll", updateFilterPopoverPosition, true);
    };
  }, [isFilterOpen]);

  useEffect(() => {
    const updateSortPopoverPosition = () => {
      if (!sortRef.current) return;

      const triggerRect = sortRef.current.getBoundingClientRect();
      const popoverWidth = 192;
      const viewportPadding = 16;

      setSortPopoverPosition({
        top: triggerRect.bottom + 8,
        left: Math.max(
          viewportPadding,
          Math.min(
            triggerRect.right - popoverWidth,
            window.innerWidth - popoverWidth - viewportPadding,
          ),
        ),
      });
    };

    if (isSortOpen) {
      updateSortPopoverPosition();
      window.addEventListener("resize", updateSortPopoverPosition);
      window.addEventListener("scroll", updateSortPopoverPosition, true);
    }

    return () => {
      window.removeEventListener("resize", updateSortPopoverPosition);
      window.removeEventListener("scroll", updateSortPopoverPosition, true);
    };
  }, [isSortOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node) &&
        !filterPopoverRef.current?.contains(event.target as Node)
      ) {
        setIsFilterOpen(false);
      }
      if (
        sortRef.current &&
        !sortRef.current.contains(event.target as Node) &&
        !sortPopoverRef.current?.contains(event.target as Node)
      ) {
        setIsSortOpen(false);
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
    "btn btn-ghost rounded-xl border-none text-base-content/65 transition hover:bg-primary/10 hover:text-primary";

  const hasActiveFilters = Boolean(activeFilter);

  return (
    <div className="madaar-surface flex w-full flex-col items-stretch gap-2 rounded-2xl border border-base-content/10 bg-base-100/75 p-2 shadow-madaar-card md:flex-row md:items-center">
      <div className="w-full grow">
        <InputField
          name="search"
          placeholder="Search teams..."
          icon={<SearchNormal1 size={18} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          classNameInput="!border-transparent !bg-transparent !shadow-none focus:!border-primary/30"
        />
      </div>

      <div className="flex w-full items-center gap-1 rounded-xl border border-base-content/10 bg-base-200/35 p-1 md:w-auto">
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

          {typeof document !== "undefined" &&
            createPortal(
              <AnimatePresence>
                {isFilterOpen && (
                  <motion.div
                    ref={filterPopoverRef}
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    style={{
                      top: filterPopoverPosition.top,
                      left: filterPopoverPosition.left,
                    }}
                    className="fixed z-50 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-base-content/10 bg-base-100/95 p-4 shadow-madaar-floating backdrop-blur-xl"
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
                          onChange={(e) =>
                            handleActiveFilterChange(e.target.value)
                          }
                        >
                          <option value="">All Teams</option>
                          <option value="true">Active Only</option>
                          <option value="false">Inactive Only</option>
                        </select>
                      </label>

                      {organizations?.length ? (
                        <label className="form-control w-full">
                          <div className="label pb-1">
                            <span className="label-text flex items-center gap-1.5 text-xs font-semibold">
                              <Building3 size={14} />
                              Organization
                            </span>
                          </div>
                          <select
                            className="select select-sm w-full border-base-300 !shadow-none"
                            value={currentOrganizationId}
                            onChange={(e) =>
                              handleOrganizationChange(e.target.value)
                            }
                          >
                            {organizations.map((organization) => (
                              <option
                                key={organization.id}
                                value={organization.id}
                              >
                                {organization.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>,
              document.body,
            )}
        </div>

        <div className="relative" ref={sortRef}>
          <button
            type="button"
            onClick={() => setIsSortOpen((prev) => !prev)}
            className={`${buttonBaseClass} flex-nowrap`}
          >
            <Sort size={18} />
            <span className="mx-1 whitespace-nowrap font-semibold">
              {activeSortLabel}
            </span>
          </button>

          {typeof document !== "undefined" &&
            createPortal(
              <AnimatePresence>
                {isSortOpen && (
                  <motion.div
                    ref={sortPopoverRef}
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    style={{
                      top: sortPopoverPosition.top,
                      left: sortPopoverPosition.left,
                    }}
                    className="fixed z-50 w-48 max-w-[calc(100vw-2rem)] rounded-2xl border border-base-content/10 bg-base-100/95 p-2 shadow-madaar-floating backdrop-blur-xl"
                  >
                    <ul className="menu w-full">
                      {sortOptions.map((opt) => (
                        <li
                          key={opt.key}
                          onClick={() => handleSortKeyChange(opt.key)}
                        >
                          <a
                            className={
                              sortConfig.key === opt.key ? "active" : ""
                            }
                          >
                            {opt.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>,
              document.body,
            )}
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
