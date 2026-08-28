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
import { useDebounce } from "../../../hooks/useDebounce";
import { useRoles } from "../../roles/hooks/useRoles";
import type { Role } from "../../roles/types";

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

  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get("search") || "",
  );
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const activeFilter = searchParams.get("is_active") || "";
  const roleFilter = searchParams.get("role_id") || "";

  const { data: rolesData } = useRoles();

  const roleOptions = useMemo(
    () => [
      { value: "", label: "All Roles" },
      ...(rolesData?.results ?? []).map((role: Role) => ({
        value: String(role.id),
        label: role.name,
      })),
    ],
    [rolesData?.results],
  );

  const sortConfig = useMemo<{ key: SortKey; dir: SortDirection }>(() => {
    const ordering = searchParams.get("ordering") || "";
    const isDesc = ordering.startsWith("-");
    const key = (isDesc ? ordering.slice(1) : ordering) as SortKey;

    return {
      key: sortOptions.some((opt) => opt.key === key) ? key : "date_joined",
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

  const handleActiveFilterChange = (value: string) => {
    onFilterChange({
      is_active: value,
      role_id: roleFilter,
    });
  };

  const handleRoleFilterChange = (value: string) => {
    onFilterChange({
      is_active: activeFilter,
      role_id: value,
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

  const hasActiveFilters = Boolean(activeFilter || roleFilter);

  return (
    // relative z-20 on the root container ensures the toolbar layer sits above grid/table content
    <div className="relative z-20 flex w-full flex-col items-center gap-3 rounded-2xl border border-base-content/8 bg-base-100/40 backdrop-blur-xl saturate-150 p-3 shadow-sm md:flex-row">
      {/* Search input matching Taskboard search bar */}
      <div className="grow w-full relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40 pointer-events-none">
          <SearchNormal1 size={18} />
        </div>
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-base-content/10 bg-base-100/40 px-4 py-2 text-sm backdrop-blur-md placeholder:text-base-content/40 focus:border-primary/50 focus:bg-base-100/80 focus:outline-none transition-all pl-10"
        />
      </div>

      {/* Pill-shaped segment group for filter/sort controls */}
      <div className="flex items-center gap-1.5 rounded-full border border-base-content/8 bg-base-100/30 backdrop-blur-md p-1">
        <div className="relative" ref={filterRef}>
          <button
            type="button"
            onClick={() => setIsFilterOpen((prev) => !prev)}
            className={`btn btn-sm rounded-full px-4 border-base-content/8 bg-base-100/40 backdrop-blur-md hover:bg-primary/10 hover:border-primary/30 hover:text-primary motion-interactive active:scale-95 transition-all duration-100 ${
              isFilterOpen || hasActiveFilters
                ? "bg-primary/10 text-primary border-primary/30"
                : "text-base-content/70"
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
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="absolute end-0 top-full z-50 mt-2 w-72 rounded-2xl border border-base-content/10 bg-base-100/95 backdrop-blur-2xl p-4 shadow-madaar-raised"
              >
                <div className="flex flex-col space-y-4">
                  <label className="form-control w-full">
                    <div className="label pb-1">
                      <span className="label-text text-xs font-semibold tracking-tight text-base-content/70">
                        Status
                      </span>
                    </div>
                    <select
                      className="select select-sm w-full border-base-content/10 rounded-xl bg-base-100/40 backdrop-blur-sm !shadow-none focus:border-primary/40 transition-all duration-200"
                      value={activeFilter}
                      onChange={(e) => handleActiveFilterChange(e.target.value)}
                    >
                      <option value="">All Users</option>
                      <option value="true">Active Only</option>
                      <option value="false">Inactive Only</option>
                    </select>
                  </label>

                  <label className="form-control w-full">
                    <div className="label pb-1">
                      <span className="label-text text-xs font-semibold tracking-tight text-base-content/70">
                        Role
                      </span>
                    </div>
                    <select
                      className="select select-sm w-full border-base-content/10 rounded-xl bg-base-100/40 backdrop-blur-sm !shadow-none focus:border-primary/40 transition-all duration-200"
                      value={roleFilter}
                      onChange={(e) => handleRoleFilterChange(e.target.value)}
                    >
                      {roleOptions.map((role) => (
                        <option key={role.value || "all"} value={role.value}>
                          {role.label}
                        </option>
                      ))}
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
            className="btn btn-sm rounded-full px-4 border-base-content/8 bg-base-100/40 backdrop-blur-md hover:bg-primary/10 hover:border-primary/30 hover:text-primary motion-interactive flex-nowrap text-base-content/70 active:scale-95 transition-all duration-100"
          >
            <Sort size={18} />
            <span className="mx-1 whitespace-nowrap font-semibold">
              {activeSortLabel}
            </span>
          </button>

          <ul
            tabIndex={0}
            className="dropdown-content z-50 mt-2 w-48 rounded-2xl border border-base-content/8 bg-base-100/90 backdrop-blur-xl p-2 shadow-madaar-raised menu"
          >
            {sortOptions.map((opt) => (
              <li key={opt.key} onClick={() => handleSortKeyChange(opt.key)}>
                <a
                  className={`rounded-xl ${
                    sortConfig.key === opt.key
                      ? "active bg-primary/10 text-primary"
                      : "text-base-content/70"
                  }`}
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
          className="btn btn-sm rounded-full px-3 border-base-content/8 bg-base-100/40 backdrop-blur-md hover:bg-primary/10 hover:border-primary/30 hover:text-primary motion-interactive text-base-content/70 btn-circle active:scale-95 transition-all duration-100"
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
