import { AnimatePresence, motion } from "framer-motion";
import {
  Add,
  Archive,
  Calendar1,
  Edit2,
  FolderOpen,
  SearchNormal1,
  TickCircle,
  Trash,
  ArrowRight2,
  People,
  TaskSquare,
  CloseCircle,
} from "iconsax-reactjs";
import { useMemo, useRef, useState } from "react";
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

const statusConfig: Record<
  ProjectStatus,
  { label: string; bgClass: string; textClass: string; dot: string }
> = {
  active:    { label: "Active",     bgClass: "bg-emerald-500/12",  textClass: "text-emerald-600",  dot: "bg-emerald-500" },
  draft:     { label: "Draft",      bgClass: "bg-base-200",        textClass: "text-base-content/55", dot: "bg-base-content/30" },
  on_hold:   { label: "On Hold",    bgClass: "bg-amber-500/12",    textClass: "text-amber-600",    dot: "bg-amber-500" },
  completed: { label: "Completed",  bgClass: "bg-blue-500/12",     textClass: "text-blue-600",     dot: "bg-blue-500" },
  archived:  { label: "Archived",   bgClass: "bg-red-500/10",      textClass: "text-red-500",      dot: "bg-red-400" },
};

const DEFAULT_COLOR = "#6366f1";

const formatDate = (value?: string | null) => {
  if (!value) return null;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
};

const getOrganizationName = (
  organization: ProjectOrganization | string | number,
) => (typeof organization === "object" ? organization.name : "Organization");

// Dropdown menu for project card actions
function ProjectActionMenu({
  project,
  onEdit,
  onDelete,
  onComplete,
  onArchive,
}: {
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
  onComplete: () => void;
  onArchive: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div className="relative" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="grid size-7 place-items-center rounded-lg text-base-content/35 opacity-0 transition group-hover:opacity-100 hover:bg-base-200 hover:text-base-content"
        aria-label={`Actions for ${project.name}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-8 z-50 min-w-[168px] rounded-2xl border border-base-content/10 bg-base-100 p-1.5 shadow-2xl"
            >
              <button
                type="button"
                onClick={() => { setOpen(false); onEdit(); }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-semibold text-base-content/70 hover:bg-base-200 hover:text-base-content"
              >
                <Edit2 size={14} /> Edit project
              </button>
              {project.status !== "completed" && project.status !== "archived" && (
                <button
                  type="button"
                  onClick={() => { setOpen(false); onComplete(); }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-semibold text-emerald-600 hover:bg-emerald-50"
                >
                  <TickCircle size={14} /> Mark complete
                </button>
              )}
              {project.status !== "archived" && (
                <button
                  type="button"
                  onClick={() => { setOpen(false); onArchive(); }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-semibold text-base-content/50 hover:bg-base-200"
                >
                  <Archive size={14} /> Archive
                </button>
              )}
              <div className="my-1 h-px bg-base-content/8" />
              <button
                type="button"
                onClick={() => { setOpen(false); onDelete(); }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-semibold text-red-500 hover:bg-red-50"
              >
                <Trash size={14} /> Delete
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const deleteProjectMutation = useDeleteProject();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "">("");

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
      total: projects.length,
      active: projects.filter((p) => p.status === "active").length,
      completed: projects.filter((p) => p.status === "completed").length,
      openTasks: projects.reduce(
        (total, p) => total + (p.task_count || 0),
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
          setDeleteModalState({ open: false, projectId: null, projectTitle: "" });
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
            One calm place to organize delivery, teams and the work behind every outcome.
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
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: summary.total, color: "text-base-content" },
          { label: "Active", value: summary.active, color: "text-emerald-600" },
          { label: "Completed", value: summary.completed, color: "text-blue-600" },
          { label: "Open tasks", value: summary.openTasks, color: "text-primary" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-base-content/10 bg-base-100 p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-base-content/45">
              {stat.label}
            </p>
            <p className={`mt-2 text-3xl font-semibold tracking-tight ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
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
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="input input-bordered w-full rounded-xl bg-base-100 pl-11"
            aria-label="Search projects"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
            >
              <CloseCircle size={18} />
            </button>
          )}
        </label>
        <div className="flex gap-2 overflow-x-auto rounded-xl border border-base-content/10 bg-base-100 p-1 sm:w-auto">
          {statuses.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setStatus(item.value)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                status === item.value
                  ? "bg-primary text-primary-content"
                  : "text-base-content/55 hover:bg-base-200 hover:text-base-content"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {projectsQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-64 animate-pulse rounded-2xl bg-base-200/70" />
          ))}
        </div>
      ) : projectsQuery.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="font-semibold text-red-600">Projects could not be loaded.</p>
          <button
            type="button"
            onClick={() => projectsQuery.refetch()}
            className="btn btn-sm btn-ghost mt-3 rounded-lg"
          >
            Try again
          </button>
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-base-content/15 bg-base-100 px-6 py-16 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <FolderOpen size={28} />
          </div>
          <h2 className="text-xl font-semibold">No projects yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-base-content/55">
            {search
              ? `No projects matching "${search}"`
              : "Create the first project to get started."}
          </p>
          {!search && (
            <button
              type="button"
              onClick={handleCreateProject}
              className="btn btn-primary mt-6 rounded-xl"
            >
              <Add size={18} /> Create your first project
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {projects.map((project) => {
              const color = project.color || DEFAULT_COLOR;
              const cfg = statusConfig[project.status];
              const progress = project.progress_percentage ?? 0;

              return (
                <motion.article
                  layout
                  key={project.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  onClick={() => openDetailsPage(project.id)}
                  className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-base-content/8 bg-base-100 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
                  style={{
                    boxShadow: `0 0 0 1px ${color}18`,
                  }}
                >
                  {/* Color top bar */}
                  <div
                    className="h-1 w-full shrink-0"
                    style={{ background: color }}
                  />

                  <div className="flex flex-1 flex-col p-5">
                    {/* Top row: icon + title + status badge + menu */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className="grid size-10 shrink-0 place-items-center rounded-xl text-white shadow-sm"
                          style={{ background: color }}
                        >
                          <FolderOpen size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-base-content transition-colors group-hover:text-primary">
                            {project.name}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-base-content/45">
                            {getOrganizationName(project.organization)}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <span
                          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${cfg.bgClass} ${cfg.textClass}`}
                        >
                          <span className={`size-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                        <ProjectActionMenu
                          project={project}
                          onEdit={() => handleEditProject(project)}
                          onDelete={() => handleDeleteClick(project)}
                          onComplete={() =>
                            lifecycleMutation.mutate({ id: project.id, action: "complete" })
                          }
                          onArchive={() =>
                            lifecycleMutation.mutate({ id: project.id, action: "archive" })
                          }
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <p className="mt-3.5 line-clamp-2 min-h-[2.8em] text-sm leading-relaxed text-base-content/55">
                      {project.description || "No description added yet."}
                    </p>

                    {/* Stats row */}
                    <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-base-200/50 px-3 py-2.5 text-center text-sm">
                      <div>
                        <p className="flex items-center justify-center gap-1 text-[10px] font-medium uppercase tracking-wide text-base-content/40">
                          <TaskSquare size={10} /> Tasks
                        </p>
                        <p className="mt-0.5 text-sm font-bold text-base-content">
                          {project.task_count || 0}
                        </p>
                      </div>
                      <div className="border-x border-base-content/8">
                        <p className="flex items-center justify-center gap-1 text-[10px] font-medium uppercase tracking-wide text-base-content/40">
                          <People size={10} /> Members
                        </p>
                        <p className="mt-0.5 text-sm font-bold text-base-content">
                          {project.member_count ?? project.members_count ?? 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-base-content/40">
                          Progress
                        </p>
                        <p
                          className="mt-0.5 text-sm font-bold"
                          style={{ color }}
                        >
                          {progress}%
                        </p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-base-200">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(100, progress)}%`,
                          background: color,
                        }}
                      />
                    </div>

                    {/* Footer */}
                    <div
                      className="mt-4 flex items-center justify-between gap-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="flex items-center gap-1.5 text-xs text-base-content/45">
                        <Calendar1 size={13} />
                        {formatDate(project.deadline) ?? "No deadline"}
                      </span>
                      <button
                        type="button"
                        onClick={() => openDetailsPage(project.id)}
                        className="flex items-center gap-1 text-xs font-bold transition-colors"
                        style={{ color }}
                      >
                        Open <ArrowRight2 size={13} />
                      </button>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <CreateEditProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        project={selectedProject}
      />

      <DeleteConfirmModal
        isOpen={deleteModalState.open}
        onClose={() =>
          setDeleteModalState({ open: false, projectId: null, projectTitle: "" })
        }
        onConfirm={handleConfirmDelete}
        isLoading={deleteProjectMutation.isPending}
        title={deleteModalState.projectTitle}
      />
    </div>
  );
}
