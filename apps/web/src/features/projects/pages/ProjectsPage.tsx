import { AnimatePresence, motion } from "framer-motion";
import {
  Add,
  Archive,
  Edit2,
  FolderOpen,
  SearchNormal1,
  TickCircle,
  Trash,
  CloseCircle,
} from "iconsax-reactjs";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Pie, PieChart, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import {
  archiveProject,
  completeProject,
  getProjects,
} from "../api/projectsApi";
import type { Project, ProjectStatus } from "../types";
import { CreateEditProjectModal } from "../components/CreateEditProjectModal";
import { DeleteConfirmModal } from "../components/DeleteConfirmModal";
import { useDeleteProject } from "../hooks/useProjects";
import { usePermissions } from "../../auth/hooks/usePermissions";


const statusConfig: Record<
  ProjectStatus,
  { label: string; bgClass: string }
> = {
  active:    { label: "Active",     bgClass: "bg-emerald-500/20 text-emerald-100" },
  draft:     { label: "Draft",      bgClass: "bg-white/20 text-white" },
  on_hold:   { label: "On Hold",    bgClass: "bg-amber-500/20 text-amber-100" },
  completed: { label: "Completed",  bgClass: "bg-blue-500/20 text-blue-100" },
  archived:  { label: "Archived",   bgClass: "bg-red-500/20 text-red-100" },
};


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
    <div className="relative z-20" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="grid size-7 place-items-center rounded-lg text-white/70 opacity-0 group-hover:opacity-100 hover:bg-white/20 hover:text-white transition duration-150"
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
              className="absolute right-0 top-8 z-50 min-w-[160px] rounded-2xl border border-base-content/10 bg-base-100 p-1.5 text-xs font-semibold shadow-2xl text-base-content"
            >
              <button
                type="button"
                onClick={() => { setOpen(false); onEdit(); }}
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left hover:bg-base-200"
              >
                <Edit2 size={14} /> Edit project
              </button>
              {project.status !== "completed" && project.status !== "archived" && (
                <button
                  type="button"
                  onClick={() => { setOpen(false); onComplete(); }}
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-emerald-600 hover:bg-emerald-500/10"
                >
                  <TickCircle size={14} /> Mark complete
                </button>
              )}
              {project.status !== "archived" && (
                <button
                  type="button"
                  onClick={() => { setOpen(false); onArchive(); }}
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-base-content/60 hover:bg-base-200"
                >
                  <Archive size={14} /> Archive
                </button>
              )}
              <div className="my-1 h-px bg-base-content/8" />
              <button
                type="button"
                onClick={() => { setOpen(false); onDelete(); }}
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-red-500 hover:bg-red-500/10"
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


function ProjectCard({
  project,
  onEdit,
  onDelete,
  onComplete,
  onArchive,
  onClick,
  canManage,
}: {
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
  onComplete: () => void;
  onArchive: () => void;
  onClick: () => void;
  canManage: boolean;
}) {
  const cfg = statusConfig[project.status];
  const taskCount = project.task_count || 0;
  const memberCount = project.member_count ?? project.members_count ?? 0;

  const progress = project.progress_percentage || 0;
  const completedTasks = project.completed_task_count || 0;
  const projectColor = project.color || "#6366f1";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-base-content/10 bg-base-100 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl"
    >
      {/* Subtle Halo effect on the right side */}
      <div 
        className="absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-10 blur-[40px] pointer-events-none transition-opacity duration-300 group-hover:opacity-20"
        style={{ backgroundColor: projectColor }}
      />
      
      {/* Content wrapper to stay above the halo */}
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <h2 dir="auto" className="flex-1 text-xl font-bold tracking-tight text-base-content">
            {project.name}
          </h2>
          <div className="flex items-center gap-2">
            <span className={`rounded-lg px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${cfg.bgClass.replace(/text-\w+-\d+/, "text-base-content")}`}>
              {cfg.label}
            </span>
            {canManage && (
              <ProjectActionMenu
                project={project}
                onEdit={onEdit}
                onDelete={onDelete}
                onComplete={onComplete}
                onArchive={onArchive}
              />
            )}
          </div>
        </div>

        <div className="mt-6 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-base-content/45">
              Tasks Progress
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-bold text-base-content">
                {completedTasks}
              </span>
              <span className="text-sm font-medium text-base-content/50">
                / {taskCount} Done
              </span>
            </div>
          </div>

          <div className="relative">
            <ResponsiveContainer width={70} height={70}>
              <PieChart>
                <Pie
                  data={[
                    { value: progress, fill: projectColor },
                    { value: 100 - progress, fill: "color-mix(in srgb, currentColor 10%, transparent)" },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={24}
                  outerRadius={32}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                  strokeWidth={0}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-base-content">{progress}%</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-base-content/50">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span className="font-medium">{memberCount} members</span>
        </div>
      </div>
    </motion.article>
  );
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const deleteProjectMutation = useDeleteProject();
  const { hasAnyPermission } = usePermissions();
  const canCreateProject = hasAnyPermission(["project.create", "project.manage"]);
  const canManageProject = hasAnyPermission(["project.manage"]);

  const [search, setSearch] = useState("");

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const [deleteModalState, setDeleteModalState] = useState<{
    open: boolean;
    projectId: string | number | null;
    projectTitle: string;
  }>({ open: false, projectId: null, projectTitle: "" });

  const projectsQuery = useQuery({
    queryKey: ["projects", search],
    queryFn: () =>
      getProjects({ search: search || undefined }),
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
      {/* Top Bar: Title & Action & Search */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-base-content sm:text-3xl">
              Projects
            </h1>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
              {projects.length}
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-base-content/50">
            Select a project to access its board, tasks, and settings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="relative block w-full sm:w-64">
            <SearchNormal1
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="h-9.5 w-full rounded-xl border border-base-content/10 bg-base-100 pl-9 pr-8 text-xs font-medium text-base-content outline-none focus:border-primary/40 transition-all placeholder:text-base-content/35"
              aria-label="Search projects"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
              >
                <CloseCircle size={15} />
              </button>
            )}
          </label>
          {/* دکمه New Project - فقط برای کاربران با پرمیشن */}
          {canCreateProject && (
            <button
              type="button"
              onClick={handleCreateProject}
              className="inline-flex h-9.5 items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-bold text-primary-content shadow-md shadow-primary/15 hover:bg-primary/90 transition-all shrink-0"
            >
              <Add size={16} />
              <span>New Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Simple Project Cards */}
      {projectsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-40 animate-pulse rounded-2xl bg-base-200/70" />
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
          <h2 className="text-xl font-semibold">No projects found</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-base-content/55">
            {search
              ? `No projects matching "${search}"`
              : "Create your first project to get started."}
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={() => handleEditProject(project)}
                onDelete={() => handleDeleteClick(project)}
                onComplete={() =>
                  lifecycleMutation.mutate({ id: project.id, action: "complete" })
                }
                onArchive={() =>
                  lifecycleMutation.mutate({ id: project.id, action: "archive" })
                }
                onClick={() => openDetailsPage(project.id)}
                canManage={canManageProject}
              />
            ))}
          </AnimatePresence>

          {/* Add New Project Card */}
          {canCreateProject && (
            <button
              type="button"
              onClick={handleCreateProject}
              className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-base-content/15 bg-base-100 text-base-content/40 transition-all hover:border-primary/30 hover:bg-base-content/5 hover:text-primary"
            >
              <Add size={28} />
              <span className="text-sm font-bold">New Project</span>
            </button>
          )}
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
