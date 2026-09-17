import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown2,
  ArrowUp2,
  Filter,
  SearchNormal1,
  Sort,
} from "iconsax-reactjs";
import { useEffect, useRef, useState } from "react";
import InputField from "../../../components/InputField";
import { useDebounce } from "../../../hooks/useDebounce";

interface ToolbarProps {
  onSearch: (query: string) => void;
  onSortChange: (sortKey: string) => void;
  onFilterChange: (filters: Record<string, string>) => void;
}

type SortKey = "created_at" | "priority" | "status" | "title";
type SortDirection = "asc" | "desc";

export const TicketsToolbar = ({
  onSearch,
  onSortChange,
  onFilterChange,
}: ToolbarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    dir: SortDirection;
  }>({ key: "created_at", dir: "desc" });

  const filterRef = useRef<HTMLDivElement>(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "title", label: "Subject" },
    { key: "priority", label: "Priority" },
    { key: "status", label: "Status" },
    { key: "created_at", label: "Created At" },
  ];

  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;
  const onFilterChangeRef = useRef(onFilterChange);
  onFilterChangeRef.current = onFilterChange;
  const onSortChangeRef = useRef(onSortChange);
  onSortChangeRef.current = onSortChange;

  useEffect(() => {
    onSearchRef.current(debouncedSearchQuery);
  }, [debouncedSearchQuery]);

  useEffect(() => {
    onFilterChangeRef.current({
      status: statusFilter,
      priority: priorityFilter,
    });
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    const sortPrefix = sortConfig.dir === "desc" ? "-" : "";
    onSortChangeRef.current(`${sortPrefix}${sortConfig.key}`);
  }, [sortConfig]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeSortLabel = sortOptions.find((opt) => opt.key === sortConfig.key)?.label;
  const buttonBaseClass = "btn btn-ghost rounded-xl hover:bg-primary/10 hover:text-primary border-none";
  const hasActiveFilters = statusFilter || priorityFilter;

  return (
    <div className="flex flex-col md:flex-row items-center gap-3 w-full p-2 bg-linear-to-r from-base-100 to-base-200/40 border-base-content/10 rounded-2xl">
      <div className="grow w-full">
        <InputField
          name="search"
          placeholder="Search tickets..."
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
            className={`${buttonBaseClass} ${isFilterOpen || hasActiveFilters ? "bg-primary/10 text-primary" : ""}`}
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
                className="absolute top-full end-0 z-10 p-4 shadow-lg bg-base-100 rounded-box w-72 mt-2 border border-base-content/10"
              >
                <div className="flex flex-col space-y-6">
                  <div className="form-control w-full">
                    <div className="label pb-1.5">
                      <span className="label-text text-xs font-semibold">
                        Status
                      </span>
                    </div>
                    <select
                      className="select select-sm w-full !shadow-none border-base-300"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="">All</option>
                      <option value="open">Open</option>
                      <option value="answered">Answered</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>

                  <div className="form-control w-full">
                    <div className="label pb-1.5">
                      <span className="label-text text-xs font-semibold">
                        Priority
                      </span>
                    </div>
                    <select
                      className="select select-sm w-full !shadow-none border-base-300"
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                    >
                      <option value="">All</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
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
                onClick={() => setSortConfig((prev) => ({ ...prev, key: opt.key }))}
              >
                <a className={sortConfig.key === opt.key ? "active" : ""}>{opt.label}</a>
              </li>
            ))}
          </ul>
        </div>

        {/* Sort Direction Toggle */}
        <button
          onClick={() => setSortConfig((prev) => ({ ...prev, dir: prev.dir === "asc" ? "desc" : "asc" }))}
          className={`${buttonBaseClass} btn-circle`}
        >
          {sortConfig.dir === "asc" ? <ArrowUp2 size={18} /> : <ArrowDown2 size={18} />}
        </button>
      </div>
    </div>
  );
};
