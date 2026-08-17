import React from "react";
import { Users, Edit2, Trash2, FolderOpen, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Project } from "../types";

interface ProjectsGridProps {
  projects: Project[];
  isLoading: boolean;
  onEdit?: (project: Project) => void;
  onDelete?: (id: string | number) => void;
  canManage?: boolean;
}

const statusStyles: Record<string, string> = {
  active: "bg-success/12 text-success",
  draft: "bg-base-200 text-base-content/65",
  on_hold: "bg-warning/15 text-warning",
  completed: "bg-info/12 text-info",
  archived: "bg-error/10 text-error",
};

const ProjectCard: React.FC<{
  project: Project;
  onEdit?: (project: Project) => void;
  onDelete?: (id: string | number) => void;
  canManage?: boolean;
}> = ({ project, onEdit, onDelete, canManage }) => {
  const navigate = useNavigate();

  const formattedDate = project.deadline
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(project.deadline))
    : "No deadline";

  const openProject = () => navigate(`/projects/${project.id}`);

  return (
    <article
      onClick={openProject}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openProject();
        }
      }}
      role="link"
      tabIndex={0}
      aria-label={`Open ${project.name}`}
      className="madaar-surface group rounded-2xl border border-base-content/10 bg-base-100 p-5 transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5 cursor-pointer flex flex-col justify-between"
    >
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
              <FolderOpen size={21} />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-base-content group-hover:text-primary transition-colors">
                {project.name}
              </h3>
              <p className="mt-0.5 truncate text-xs text-base-content/45">
                Budget: ${Number(project.budget || 0).toLocaleString()}
              </p>
            </div>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${statusStyles[project.status] || statusStyles.draft}`}
          >
            {project.status.replace("_", " ")}
          </span>
        </div>

        <p className="mt-4 min-h-10 line-clamp-2 text-sm leading-6 text-base-content/60">
          {project.description || "No description added yet."}
        </p>

        <div className="mt-4">
          <div className="flex justify-between text-xs text-base-content/50 mb-1.5 font-medium">
            <span>Progress</span>
            <span>{project.progress_percentage || 0}%</span>
          </div>
          <progress
            className="progress progress-primary w-full h-1.5 bg-base-200"
            value={project.progress_percentage || 0}
            max="100"
          />
        </div>
      </div>

      <div className="mt-5 border-t border-base-content/10 pt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs text-base-content/50">
          <span className="flex items-center gap-1">
            <Calendar size={14} /> {formattedDate}
          </span>
          <span className="flex items-center gap-1">
            <Users size={14} /> {project.members_count || 0}
          </span>
        </div>

        {canManage && (
          <div
            className="flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => onEdit?.(project)}
              className="btn btn-ghost btn-square btn-sm rounded-lg text-base-content/60 hover:text-primary"
              aria-label={`Edit ${project.name}`}
            >
              <Edit2 size={16} />
            </button>
            <button
              type="button"
              onClick={() => onDelete?.(project.id)}
              className="btn btn-ghost btn-square btn-sm rounded-lg text-base-content/60 hover:text-error"
              aria-label={`Delete ${project.name}`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
    </article>
  );
};

export const ProjectsGrid: React.FC<ProjectsGridProps> = ({
  projects,
  isLoading,
  onEdit,
  onDelete,
  canManage = true,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-2xl bg-base-200/70"
          ></div>
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="madaar-surface rounded-[28px] border border-dashed border-base-content/15 bg-base-100 px-6 py-16 text-center">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <FolderOpen size={28} />
        </div>
        <h2 className="text-xl font-semibold">No projects found</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-base-content/55">
          Try adjusting your search query or filters to find what you are
          looking for.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onEdit={onEdit}
          onDelete={onDelete}
          canManage={canManage}
        />
      ))}
    </div>
  );
};
