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

  const [activeFilter, setActiveFilter] = useState(
    () => searchParams.get("is_active") || "",
  );
  const [roleFilter, setRoleFilter] = useState(
    () => searchParams.get("role_id") || "",
  );

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
      role_id: roleFilter,
    });
  }, [activeFilter, roleFilter]);

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

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const activeSortLabel = sortOptions.find(
    (opt) => opt.key === sortConfig.key,
  )?.label;

  const buttonBaseClass =
    "btn btn-ghost rounded-xl hover:bg-primary/10 hover:text-primary border-none";

  const hasActiveFilters = Boolean(activeFilter || roleFilter);

  return (
    <div className="flex w-full flex-col items-center gap-3 rounded-2xl border border-base-content/10 bg-linear-to-r from-base-100 to-base-200/40 p-2 md:flex-row">
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
                className="absolute right-0 top-full z-10 mt-2 w-72 rounded-box border border-base-content/10 bg-base-100 p-4 shadow-lg md:left-0 md:right-auto"
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
                      className="select select-sm w-full border-base-300 !shadow-none"
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
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
          type="button"
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
