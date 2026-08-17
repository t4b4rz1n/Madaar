import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Add, Briefcase } from "iconsax-reactjs";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Pagination } from "../../../components/Pagination";
import { ViewSwitcher } from "../../../components/ViewSwitcher";
import { ProjectsGrid } from "../components/ProjectsGrid";
import { ProjectsTable } from "../components/ProjectsTable";
import { ProjectsToolbar } from "../components/ProjectsToolbar";
import { useProjects, useDeleteProject } from "../hooks/useProjects";
import type { Project, ProjectListParams, ProjectStatus } from "../types";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { CreateEditProjectModal } from "../components/CreateEditProjectModal";
import { DeleteConfirmModal } from "../components/DeleteConfirmModal";

type ViewMode = "grid" | "table";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export default function ProjectsListPage() {
  const shouldReduceMotion = useReducedMotion();
  const { hasAllPermissions } = usePermissions();
  const canManageProjects = hasAllPermissions(["projects.manage"]);
  const deleteProjectMutation = useDeleteProject();
  const [searchParams, setSearchParams] = useSearchParams();

  // State Management
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [deleteModalState, setDeleteModalState] = useState<{
    open: boolean;
    projectId: string | number | null;
    projectTitle: string;
  }>({ open: false, projectId: null, projectTitle: "" });

  const [modalState, setModalState] = useState<{
    open: boolean;
    project: Project | null;
  }>({ open: false, project: null });

  // Memoized Search Query Params
  const searchQueryParams = useMemo<ProjectListParams>(() => {
    return {
      search: searchParams.get("search") || undefined,
      status: (searchParams.get("status") as ProjectStatus) || undefined,
    };
  }, [searchParams]);

  // Fetch Projects Data
  const {
    data: projectsResponse,
    isLoading,
    isFetching,
  } = useProjects(searchQueryParams);

  const showLoading = isLoading || isFetching;

  const projects = useMemo(() => projectsResponse ?? [], [projectsResponse]);

  // Pagination Values
  const requestedPage = Number(searchParams.get("page")) || 1;
  const requestedPageSize = Number(searchParams.get("page_size")) || 10;
  const pageSize = requestedPageSize > 0 ? requestedPageSize : 10;
  const totalResults = projects.length;
  const totalPages = Math.ceil(totalResults / pageSize) || 1;
  const currentPage = Math.min(Math.max(requestedPage, 1), totalPages);
  const visibleProjects = useMemo(() => {
    const pageStart = (currentPage - 1) * pageSize;
    return projects.slice(pageStart, pageStart + pageSize);
  }, [currentPage, pageSize, projects]);

  // Search & Filter Handlers
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
        newParams.delete("status");

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

  const handlePageChange = useCallback(
    (page: number) => updateSearchParams("page", page.toString()),
    [updateSearchParams],
  );

  const handlePageSizeChange = useCallback(
    (size: number) => updateSearchParams("page_size", size.toString()),
    [updateSearchParams],
  );

  // Modal Actions
  const handleCreateProject = () => {
    setModalState({ open: true, project: null });
  };

  const handleEditProject = (project: Project) => {
    setModalState({ open: true, project });
  };

  const handleCloseModal = () => {
    setModalState({ open: false, project: null });
  };

  const handleDeleteClick = (id: string | number) => {
    const targetProject = projects.find((p: Project) => p.id === id);
    setDeleteModalState({
      open: true,
      projectId: id,
      projectTitle: targetProject?.name || "this project",
    });
  };

  const handleConfirmDelete = () => {
    if (deleteModalState.projectId !== null) {
      deleteProjectMutation.mutate(deleteModalState.projectId, {
        onSuccess: () => {
          setDeleteModalState({
            open: false,
            projectId: null,
            projectTitle: "",
          });
        },
      });
    }
  };

  return (
    <>
      <motion.div
        variants={containerVariants}
        initial={shouldReduceMotion ? false : "hidden"}
        animate="visible"
        className="madaar-surface flex min-h-[calc(100vh-121px)] min-w-0 flex-col rounded-[28px] border border-base-content/10 bg-base-100 p-4 shadow-sm sm:p-6 lg:p-8"
      >
        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
        >
          <div className="min-w-0">
            <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-base-content sm:text-3xl">
              <Briefcase size={30} className="shrink-0 text-primary" />
              <span className="truncate">Projects</span>
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-base-content/60">
              Manage, track, and allocate resources for organizational projects.
            </p>
          </div>
          <div className="flex w-full flex-col items-stretch gap-2.5 sm:flex-row sm:items-center lg:w-auto lg:justify-end">
            <ViewSwitcher
              viewMode={viewMode}
              setViewMode={setViewMode}
              className="w-full sm:w-auto"
            />
            {canManageProjects && (
              <button
                type="button"
                onClick={handleCreateProject}
                className="btn btn-primary min-h-11 w-full gap-2 rounded-xl text-sm shadow-lg shadow-primary/15 sm:w-auto"
              >
                <Add size={20} />
                <span>Create Project</span>
              </button>
            )}
          </div>
        </motion.div>

        {/* Toolbar */}
        <motion.div variants={itemVariants} className="mt-6">
          <ProjectsToolbar
            onSearch={handleSearch}
            onSortChange={handleSort}
            onFilterChange={handleFilter}
          />
        </motion.div>

        {/* Content View */}
        <motion.div variants={itemVariants} className="mt-6 min-w-0 grow">
          <AnimatePresence mode="wait">
            <motion.div
              key={viewMode}
              initial={
                shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }
              }
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {viewMode === "table" ? (
                <ProjectsTable
                  projects={visibleProjects}
                  isLoading={showLoading}
                  onEdit={handleEditProject}
                  onDelete={handleDeleteClick}
                  canManage={canManageProjects}
                />
              ) : (
                <ProjectsGrid
                  projects={visibleProjects}
                  isLoading={showLoading}
                  onEdit={handleEditProject}
                  onDelete={handleDeleteClick}
                  canManage={canManageProjects}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Pagination */}
        <motion.div variants={itemVariants} className="mt-auto min-w-0 pt-6">
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
      {canManageProjects && (
        <CreateEditProjectModal
          isOpen={modalState.open}
          onClose={handleCloseModal}
          project={modalState.project}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalState.open}
        onClose={() =>
          setDeleteModalState({
            open: false,
            projectId: null,
            projectTitle: "",
          })
        }
        onConfirm={handleConfirmDelete}
        isLoading={deleteProjectMutation.isPending}
        title={deleteModalState.projectTitle}
      />
    </>
  );
}
