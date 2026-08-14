import { AnimatePresence, motion } from "framer-motion";
import { Add, Briefcase } from "iconsax-reactjs";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Pagination } from "../../../components/Pagination";
import { ViewSwitcher } from "../../../components/ViewSwitcher";
import { ProjectsGrid } from "../components/ProjectsGrid";
import { ProjectsTable } from "../components/ProjectsTable";
import { ProjectsToolbar } from "../components/ProjectsToolbar";
import { useProjects, useDeleteProject } from "../hooks/useProjects";
import type { Project } from "../types";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { CreateEditProjectModal } from "../components/CreateEditProjectModal";
import { DeleteConfirmModal } from "../components/DeleteConfirmModal";
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

export default function ProjectsListPage() {
  const { hasAllPermissions } = usePermissions();

  const canManageProjects = hasAllPermissions(["projects.manage"]);
  const deleteProjectMutation = useDeleteProject();
  const [searchParams, setSearchParams] = useSearchParams();
  const [deleteModalState, setDeleteModalState] = useState<{
    open: boolean;
    projectId: string | number | null;
    projectTitle: string;
  }>({ open: false, projectId: null, projectTitle: "" });
  const [modalState, setModalState] = useState<{
    open: boolean;
    project: Project | null;
  }>({ open: false, project: null });

  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const {
    data: projectsResponse,
    isLoading,
    isFetching,
  } = useProjects(searchParams);

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

  const currentPage = projectsResponse?.data?.current_page || 1;
  const pageSize = Number(searchParams.get("page_size")) || 10;
  const totalPages = projectsResponse?.data?.total_pages || 1;
  const totalResults = projectsResponse?.data?.total_results || 0;

  const handlePageChange = useCallback(
    (page: number) => updateSearchParams("page", page.toString()),
    [updateSearchParams],
  );

  const handlePageSizeChange = useCallback(
    (size: number) => updateSearchParams("page_size", size.toString()),
    [updateSearchParams],
  );

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
    if (deleteModalState.projectId) {
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

  const projects = useMemo(
    () => projectsResponse?.data?.results || [],
    [projectsResponse?.data?.results],
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
              <Briefcase size={28} /> Projects
            </h1>
            <p className="text-base-content/70 mt-1">
              Manage, track, and allocate resources for organizational projects.
            </p>
          </div>
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
            <ViewSwitcher
              viewMode={viewMode}
              setViewMode={setViewMode}
              className="w-full sm:w-auto"
            />
            {canManageProjects && (
              <button
                onClick={handleCreateProject}
                className="btn btn-primary rounded-xl gap-2"
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
                <ProjectsTable
                  projects={projects}
                  isLoading={showLoading}
                  onEdit={handleEditProject}
                  onDelete={handleDeleteClick} // <--- تغییر کرد
                  canManage={canManageProjects}
                />
              ) : (
                <ProjectsGrid
                  projects={projects}
                  isLoading={showLoading}
                  onEdit={handleEditProject}
                  onDelete={handleDeleteClick} // <--- تغییر کرد
                  canManage={canManageProjects}
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
      <CreateEditProjectModal
        isOpen={canManageProjects && modalState.open}
        onClose={handleCloseModal}
        project={modalState.project}
      />
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
