import { AnimatePresence, motion } from "framer-motion";
import {
  Add,
  Archive,
  ArrowRight2,
  Calendar1,
  Edit2,
  FolderOpen,
  SearchNormal1,
  TickCircle,
  Trash,
} from "iconsax-reactjs";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  archiveProject,
  completeProject,
  getProjects,
} from "../api/projectsApi";
import type { Project, ProjectOrganization, ProjectStatus } from "../types";
import { CreateEditProjectModal } from "../components/CreateEditProjectModal";
import { DeleteConfirmModal } from "../components/DeleteConfirmModal";
import { useDeleteProject } from "../hooks/useProjects";

const statuses: Array<{ value: ProjectStatus | ""; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "on_hold", label: "On hold" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

const statusStyles: Record<ProjectStatus, string> = {
  active: "bg-success/12 text-success",
  draft: "bg-base-200 text-base-content/65",
  on_hold: "bg-warning/15 text-warning",
  completed: "bg-info/12 text-info",
  archived: "bg-error/10 text-error",
};

const statusLabels: Record<ProjectStatus, string> = {
  active: "Active",
  draft: "Draft",
  on_hold: "On hold",
  completed: "Completed",
  archived: "Archived",
};

const formatDate = (value?: string | null) => {
  if (!value) return "No deadline";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
};

const getOrganizationName = (
  organization: ProjectOrganization | string | number,
) => (typeof organization === "object" ? organization.name : "Organization");

export default function ProjectsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const deleteProjectMutation = useDeleteProject();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "">("");

  // Modals States
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const [deleteModalState, setDeleteModalState] = useState<{
    open: boolean;
    projectId: string | number | null;
    projectTitle: string;
  }>({ open: false, projectId: null, projectTitle: "" });

  const projectsQuery = useQuery({
    queryKey: ["projects", search, status],
    queryFn: () =>
      getProjects({ search: search || undefined, status: status || undefined }),
  });

  const lifecycleMutation = useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: string | number;
      action: "archive" | "complete";
    }) => (action === "archive" ? archiveProject(id) : completeProject(id)),
    onSuccess: (_project, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success(
        variables.action === "archive"
          ? "Project archived"
          : "Project marked complete",
      );
    },
    onError: () => toast.error("Could not update project status."),
  });

  const projects = useMemo(
    () => projectsQuery.data || [],
    [projectsQuery.data],
  );
  const summary = useMemo(
    () => ({
      active: projects.filter((project) => project.status === "active").length,
      openTasks: projects.reduce(
        (total, project) => total + (project.task_count || 0),
        0,
      ),
    }),
    [projects],
  );

  const openDetailsPage = (projectId: string | number) => {
    navigate(`/projects/${projectId}`);
  };

  const handleCreateProject = () => {
    setSelectedProject(null);
    setIsProjectModalOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setIsProjectModalOpen(true);
  };

  const handleDeleteClick = (project: Project) => {
    setDeleteModalState({
      open: true,
      projectId: project.id,
      projectTitle: project.name,
    });
  };

  const handleConfirmDelete = () => {
    if (deleteModalState.projectId !== null) {
      deleteProjectMutation.mutate(deleteModalState.projectId, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["projects"] });
          toast.success("Project deleted successfully");
          setDeleteModalState({
            open: false,
            projectId: null,
            projectTitle: "",
          });
        },
        onError: () => toast.error("Could not delete project."),
      });
    }
  };

  return (
    <div className="min-h-[calc(100vh-121px)] space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
            <FolderOpen size={16} /> Workspace
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-base-content sm:text-4xl">
            Projects
          </h1>
          <p className="mt-2 max-w-2xl text-base-content/60">
            One calm place to organize delivery, teams and the work behind every
            outcome.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreateProject}
          className="btn btn-primary rounded-xl px-5 shadow-lg shadow-primary/15"
        >
          <Add size={18} /> New project
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="madaar-surface rounded-2xl border border-base-content/10 bg-base-100 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-base-content/45">
            Total projects
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">
            {projects.length}
          </p>
        </div>
        <div className="madaar-surface rounded-2xl border border-base-content/10 bg-base-100 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-base-content/45">
            Active now
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-success">
            {summary.active}
          </p>
        </div>
        <div className="madaar-surface rounded-2xl border border-base-content/10 bg-base-100 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-base-content/45">
            Tracked tasks
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-primary">
            {summary.openTasks}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative block flex-1">
          <SearchNormal1
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base-content/40"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search projects..."
            className="input input-bordered w-full rounded-xl bg-base-100 pl-11"
            aria-label="Search projects"
          />
        </label>
        <select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as ProjectStatus | "")
          }
          className="select select-bordered rounded-xl bg-base-100 sm:w-48"
          aria-label="Filter projects by status"
        >
          {statuses.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {projectsQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-64 animate-pulse rounded-2xl bg-base-200/70"
            />
          ))}
        </div>
      ) : projectsQuery.isError ? (
        <div className="madaar-surface rounded-2xl border border-error/20 bg-error/5 p-8 text-center">
          <p className="font-semibold text-error">
            Projects could not be loaded.
          </p>
          <button
            type="button"
            onClick={() => projectsQuery.refetch()}
            className="btn btn-sm btn-ghost mt-3 rounded-lg"
          >
            Try again
          </button>
        </div>
      ) : projects.length === 0 ? (
        <div className="madaar-surface rounded-[28px] border border-dashed border-base-content/15 bg-base-100 px-6 py-16 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <FolderOpen size={28} />
          </div>
          <h2 className="text-xl font-semibold">No projects yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-base-content/55">
            Create the first project to get started.
          </p>
          <button
            type="button"
            onClick={handleCreateProject}
            className="btn btn-primary mt-6 rounded-xl"
          >
            <Add size={18} /> Create your first project
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {projects.map((project) => (
              <motion.article
                layout
                key={project.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                onClick={() => openDetailsPage(project.id)}
                className="madaar-surface group cursor-pointer rounded-2xl border border-base-content/10 bg-base-100 p-5 transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3 text-left">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <FolderOpen size={21} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-lg font-semibold text-base-content group-hover:text-primary transition-colors">
                        {project.name}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-base-content/45">
                        {getOrganizationName(project.organization)}
                      </span>
                    </span>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusStyles[project.status]}`}
                  >
                    {statusLabels[project.status]}
                  </span>
                </div>
                <p className="mt-5 min-h-10 line-clamp-2 text-sm leading-6 text-base-content/60">
                  {project.description || "No description added yet."}
                </p>

                {/* بخش آمار ۳ تایی: Tasks, Members, Teams */}
                <div className="mt-5 grid grid-cols-3 gap-2 border-y border-base-content/10 py-4 text-sm text-center">
                  <div>
                    <p className="text-xs text-base-content/45">Tasks</p>
                    <p className="mt-1 font-semibold">
                      {project.task_count || 0}
                    </p>
                  </div>
                  <div className="border-x border-base-content/10">
                    <p className="text-xs text-base-content/45">Members</p>
                    <p className="mt-1 font-semibold">
                      {project.member_count ?? project.members_count ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-base-content/45">Teams</p>
                    <p className="mt-1 font-semibold text-primary">
                      {project.teams_count ?? 0}
                    </p>
                  </div>
                </div>

                <div
                  className="mt-4 flex items-center justify-between gap-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="flex items-center gap-1.5 text-xs text-base-content/50">
                    <Calendar1 size={14} /> {formatDate(project.deadline)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openDetailsPage(project.id)}
                      className="btn btn-ghost btn-sm rounded-lg text-primary"
                    >
                      Open <ArrowRight2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditProject(project)}
                      className="btn btn-ghost btn-square btn-sm rounded-lg"
                      aria-label={`Edit ${project.name}`}
                    >
                      <Edit2 size={16} />
                    </button>
                    {project.status !== "completed" &&
                      project.status !== "archived" && (
                        <button
                          type="button"
                          onClick={() =>
                            lifecycleMutation.mutate({
                              id: project.id,
                              action: "complete",
                            })
                          }
                          className="btn btn-ghost btn-square btn-sm rounded-lg text-success"
                          aria-label={`Complete ${project.name}`}
                        >
                          <TickCircle size={16} />
                        </button>
                      )}
                    {project.status !== "archived" && (
                      <button
                        type="button"
                        onClick={() =>
                          lifecycleMutation.mutate({
                            id: project.id,
                            action: "archive",
                          })
                        }
                        className="btn btn-ghost btn-square btn-sm rounded-lg text-base-content/45"
                        aria-label={`Archive ${project.name}`}
                      >
                        <Archive size={16} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(project)}
                      className="btn btn-ghost btn-square btn-sm rounded-lg text-error"
                      aria-label={`Delete ${project.name}`}
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create / Edit Modal Component */}
      <CreateEditProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        project={selectedProject}
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
    </div>
  );
}
