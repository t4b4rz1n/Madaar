import { AnimatePresence, motion } from "framer-motion";
import { Add, People } from "iconsax-reactjs";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Pagination } from "../../../components/Pagination";
import { ViewSwitcher } from "../../../components/ViewSwitcher";
import { CreateEditTeamModal } from "../components/CreateEditTeamModal";
import { TeamsGrid } from "../components/TeamsGrid";
import { TeamsTable } from "../components/TeamsTable";
import { TeamsToolbar } from "../components/TeamsToolbar";
import { useTeams } from "../hooks/useTeams";
import type { TeamWithDetails } from "../types";
import { usePermissions } from "../../auth/hooks/usePermissions";

type ViewMode = "grid" | "table";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function TeamsListPage() {
  const { hasAllPermissions } = usePermissions();

  // مجوز مدیریت تیم‌ها
  const canManageTeams = hasAllPermissions(["teams.manage"]);

  const [searchParams, setSearchParams] = useSearchParams();
  const [modalState, setModalState] = useState<{
    open: boolean;
    team: TeamWithDetails | null;
  }>({ open: false, team: null });

  // پیش‌فرض نمایش کارتی (Grid)
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const {
    data: teamsResponse,
    isLoading,
    isFetching,
    isError,
  } = useTeams(searchParams);
  const showLoading = isLoading || isFetching;

  const updateSearchParams = useCallback(
    (key: string, value: string) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        if (value) {
          newParams.set(key, value);
        } else {
          newParams.delete(key);
        }
        if (key !== "page") {
          newParams.set("page", "1");
        }
        return newParams;
      });
    },
    [setSearchParams],
  );

  const handleFilter = useCallback(
    (filters: Record<string, string>) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        newParams.delete("is_active");
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            newParams.set(key, value);
          }
        });

        newParams.set("page", "1");
        return newParams;
      });
    },
    [setSearchParams],
  );

  const handleSort = useCallback(
    (sortKey: string) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        newParams.set("ordering", sortKey);
        newParams.set("page", "1");
        return newParams;
      });
    },
    [setSearchParams],
  );

  const handleSearch = useCallback(
    (query: string) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        if (query) {
          newParams.set("search", query);
        } else {
          newParams.delete("search");
        }
        newParams.set("page", "1");
        return newParams;
      });
    },
    [setSearchParams],
  );

  const currentPage = teamsResponse?.current_page || 1;
  const pageSize = Number(searchParams.get("page_size")) || 10;
  const totalPages = teamsResponse?.total_pages || 1;
  const totalResults = teamsResponse?.total_results || 0;

  const handlePageChange = useCallback(
    (page: number) => updateSearchParams("page", page.toString()),
    [updateSearchParams],
  );

  const handlePageSizeChange = useCallback(
    (size: number) => updateSearchParams("page_size", size.toString()),
    [updateSearchParams],
  );

  const handleCreateTeam = () => {
    setModalState({ open: true, team: null });
  };

  const handleEditTeam = (team: TeamWithDetails) => {
    setModalState({ open: true, team });
  };

  const handleCloseModal = () => {
    setModalState({ open: false, team: null });
  };

  const teams = useMemo(
    () => teamsResponse?.results || [],
    [teamsResponse?.results],
  );

  return (
    <>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="bg-base-100 min-h-[calc(100vh-121px)] backdrop-blur-lg border border-base-content/10 rounded-2xl p-4 sm:p-6 flex flex-col"
      >
        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col md:flex-row md:justify-between md:items-start gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-base-content">
              <People size={28} /> Teams Management
            </h1>
            <p className="text-base-content/70 mt-1">
              Manage and structure organizational teams and squads.
            </p>
          </div>
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
            <ViewSwitcher
              viewMode={viewMode}
              setViewMode={setViewMode}
              className="w-full sm:w-auto"
            />
            {canManageTeams && (
              <button
                onClick={handleCreateTeam}
                className="btn btn-primary rounded-xl gap-2"
              >
                <Add size={20} />
                <span>Create Team</span>
              </button>
            )}
          </div>
        </motion.div>

        {/* Toolbar */}
        <motion.div variants={itemVariants} className="mt-6">
          <TeamsToolbar
            onSearch={handleSearch}
            onSortChange={handleSort}
            onFilterChange={handleFilter}
          />
        </motion.div>

        {/* Content */}
        <motion.div variants={itemVariants} className="grow mt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={viewMode}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {viewMode === "table" ? (
                <TeamsTable
                  teams={teams}
                  isLoading={showLoading}
                  isError={isError}
                  onEdit={handleEditTeam}
                  canManage={canManageTeams}
                />
              ) : (
                <TeamsGrid
                  teams={teams}
                  isLoading={showLoading}
                  isError={isError}
                  onEdit={handleEditTeam}
                  canManage={canManageTeams}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Pagination */}
        <motion.div variants={itemVariants} className="mt-auto pt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalCount={totalResults}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </motion.div>
      </motion.div>

      {/* Create/Edit Modal */}
      <CreateEditTeamModal
        isOpen={canManageTeams && modalState.open}
        onClose={handleCloseModal}
        team={modalState.team}
      />
    </>
  );
}
