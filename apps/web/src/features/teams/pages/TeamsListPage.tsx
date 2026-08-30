import { AnimatePresence, motion } from "framer-motion";
import { Add } from "iconsax-reactjs";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getOrganizations } from "../../organizations/api/organizationsApi";
import { useDeleteTeam } from "../hooks/useTeams";
import { ConfirmationModal } from "../../../components/ConfirmationModal";
import { Pagination } from "../../../components/Pagination";
import { ViewSwitcher } from "../../../components/ViewSwitcher";
import { CreateEditTeamModal } from "../components/CreateEditTeamModal";
import { TeamMembersModal } from "../components/TeamMembersModal";
import { TeamSquadsModal } from "../components/TeamSquadsModal";
import { TeamsGrid } from "../components/TeamsGrid";
import { TeamsTable } from "../components/TeamsTable";
import { TeamsToolbar } from "../components/TeamsToolbar";
import { useTeams } from "../hooks/useTeams";
import type { Team, TeamWithDetails } from "../types";
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
  const { hasAnyPermission } = usePermissions();

  // مجوز مدیریت تیم‌ها
  const canManageTeams = hasAnyPermission(["org.manage_members", "org.manage_settings"]);

  const [searchParams, setSearchParams] = useSearchParams();
  const [modalState, setModalState] = useState<{
    open: boolean;
    team: TeamWithDetails | null;
  }>({ open: false, team: null });
  const [selectedSquadTeam, setSelectedSquadTeam] = useState<Team | null>(null);
  const [selectedMemberTeam, setSelectedMemberTeam] = useState<Team | null>(null);

  // Organization context
  const { data: organizations } = useQuery({
    queryKey: ["organizations"],
    queryFn: getOrganizations,
    staleTime: 60_000,
  });
  const currentOrgName = organizations?.[0]?.name;

  // Delete team state
  const [deleteModalState, setDeleteModalState] = useState<{
    open: boolean;
    team: TeamWithDetails | null;
  }>({ open: false, team: null });
  const deleteTeam = useDeleteTeam();

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

  const handleManageSquads = (team: TeamWithDetails) => {
    setSelectedSquadTeam(team);
  };

  const handleCloseSquadModal = () => {
    setSelectedSquadTeam(null);
  };

  const handleManageMembers = (team: TeamWithDetails) => {
    setSelectedMemberTeam(team);
  };

  const handleCloseMembersModal = () => {
    setSelectedMemberTeam(null);
  };

  const handleDeleteTeam = (team: TeamWithDetails) => {
    setDeleteModalState({ open: true, team });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModalState.team) return;
    try {
      await deleteTeam.mutateAsync(deleteModalState.team.id);
      setDeleteModalState({ open: false, team: null });
    } catch {
      // toast handled by hook
    }
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
          className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"
        >
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-base-content sm:text-3xl">
                Teams
              </h1>
              {currentOrgName && (
                <span className="rounded-full bg-primary/5 border border-primary/20 px-3 py-0.5 text-xs font-semibold text-primary flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  {currentOrgName}
                </span>
              )}
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                {totalResults}
              </span>
            </div>
            <p className="mt-1 text-xs font-medium text-base-content/50">
              Manage and structure organizational teams and squads.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitcher
              viewMode={viewMode}
              setViewMode={setViewMode}
              className="w-full sm:w-auto"
            />
            {canManageTeams && (
              <button
                type="button"
                onClick={handleCreateTeam}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-xs font-bold text-primary-content shadow-md shadow-primary/15 hover:bg-primary/90 transition-all"
              >
                <Add size={16} />
                <span>New Team</span>
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
                  onManageSquads={handleManageSquads}
                  onManageMembers={handleManageMembers}
                  onDelete={handleDeleteTeam}
                  canManage={canManageTeams}
                />
              ) : (
                <TeamsGrid
                  teams={teams}
                  isLoading={showLoading}
                  isError={isError}
                  onEdit={handleEditTeam}
                  onManageSquads={handleManageSquads}
                  onManageMembers={handleManageMembers}
                  onDelete={handleDeleteTeam}
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
      <TeamSquadsModal
        team={selectedSquadTeam}
        isOpen={selectedSquadTeam !== null}
        onClose={handleCloseSquadModal}
        onManageMembers={handleManageMembers}
      />
      <TeamMembersModal
        team={selectedMemberTeam}
        isOpen={selectedMemberTeam !== null}
        onClose={handleCloseMembersModal}
      />
      <ConfirmationModal
        isOpen={deleteModalState.open}
        onClose={() => setDeleteModalState({ open: false, team: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Team"
        message={`Are you sure you want to delete the team "${deleteModalState.team?.name}"? This action cannot be undone.`}
        isLoading={deleteTeam.isPending}
      />
    </>
  );
}
