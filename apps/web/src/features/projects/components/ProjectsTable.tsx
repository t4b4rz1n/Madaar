import React from "react";
import { Users, Edit2, Trash2, FolderOpen, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Project } from "../types";

interface ProjectsTableProps {
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

export const ProjectsTable: React.FC<ProjectsTableProps> = ({
  projects,
  isLoading,
  onEdit,
  onDelete,
  canManage = true,
}) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="madaar-surface rounded-2xl border border-base-content/10 bg-base-100 p-4">
        <div className="skeleton h-72 w-full rounded-xl bg-base-200/70"></div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="madaar-surface rounded-[28px] border border-dashed border-base-content/15 bg-base-100 px-6 py-16 text-center">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <FolderOpen size={28} />
        </div>
        <h2 className="text-xl font-semibold text-base-content">
          No projects found
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-base-content/55">
          Try adjusting your search query or filters to find what you are
          looking for.
        </p>
      </div>
    );
  }

  return (
    <div className="madaar-surface overflow-hidden rounded-2xl border border-base-content/10 bg-base-100 shadow-sm">
      {/* Mobile Card-List View */}
      <div className="divide-y divide-base-content/10 md:hidden">
        {projects.map((project) => {
          const formattedDate = project.deadline
            ? new Intl.DateTimeFormat("en", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }).format(new Date(project.deadline))
            : "No deadline";

          return (
            <article
              key={project.id}
              onClick={() => navigate(`/projects/${project.id}`)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  navigate(`/projects/${project.id}`);
                }
              }}
              role="link"
              tabIndex={0}
              aria-label={`Open ${project.name}`}
              className="group cursor-pointer p-4 transition-colors hover:bg-base-200/40 focus-visible:outline-none"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
                  <FolderOpen size={21} />
                </div>
                <div className="min-w-0 grow">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-base-content transition-colors group-hover:text-primary">
                        {project.name}
                      </h3>
                      <p className="mt-0.5 line-clamp-1 text-xs text-base-content/50">
                        {project.description || "No description"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${statusStyles[project.status] || statusStyles.draft}`}
                    >
                      {project.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1.5 flex justify-between text-xs font-semibold text-base-content/60">
                      <span>Progress</span>
                      <span>{project.progress_percentage || 0}%</span>
                    </div>
                    <progress
                      className="progress progress-primary h-1.5 w-full bg-base-200"
                      value={project.progress_percentage || 0}
                      max="100"
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-base-content/60">
                    <span className="inline-flex items-center gap-1.5">
                      <Users size={14} />
                      {project.members_count || 0} members
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <Calendar size={14} className="shrink-0" />
                      <span className="truncate">{formattedDate}</span>
                    </span>
                    <span className="font-medium text-base-content/80">
                      ${Number(project.budget || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {canManage && (
                <div
                  className="mt-3 flex justify-end gap-1 border-t border-base-content/10 pt-3"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => onEdit?.(project)}
                    className="btn btn-ghost btn-sm rounded-lg px-3 text-base-content/60 hover:text-primary"
                    aria-label={`Edit ${project.name}`}
                  >
                    <Edit2 size={16} />
                    Edit
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
            </article>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden overflow-x-auto md:block">
        <table className="table w-full min-w-[760px]">
          <thead className="bg-base-200/50 text-xs font-semibold uppercase text-base-content/60">
            <tr>
              <th className="py-4 ps-6">Project Name</th>
              <th className="py-4">Status</th>
              <th className="py-4">Progress</th>
              <th className="hidden py-4 lg:table-cell">Budget</th>
              <th className="py-4">Members</th>
              <th className="py-4">Due Date</th>
              {canManage && <th className="py-4 pe-6 text-end">Actions</th>}
            </tr>
          </thead>

          <tbody className="divide-y divide-base-content/10 text-sm">
            {projects.map((project) => {
              const formattedDate = project.deadline
                ? new Intl.DateTimeFormat("en", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }).format(new Date(project.deadline))
                : "No deadline";

              return (
                <tr
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate(`/projects/${project.id}`);
                    }
                  }}
                  role="link"
                  tabIndex={0}
                  aria-label={`Open ${project.name}`}
                  className="group cursor-pointer transition-colors hover:bg-base-200/40 focus-visible:outline-none"
                >
                  <td className="py-4 ps-6">
                    <div className="flex items-center gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
                        <FolderOpen size={20} />
                      </div>
                      <div className="max-w-52 lg:max-w-xs">
                        <div className="font-semibold text-base-content truncate group-hover:text-primary transition-colors">
                          {project.name}
                        </div>
                        <div className="text-xs text-base-content/50 truncate">
                          {project.description || "No description"}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-4">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${statusStyles[project.status] || statusStyles.draft}`}
                    >
                      {project.status.replace("_", " ")}
                    </span>
                  </td>

                  <td className="w-36 py-4 lg:w-44">
                    <div className="flex items-center gap-3">
                      <progress
                        className="progress progress-primary h-1.5 w-16 bg-base-200 lg:w-24"
                        value={project.progress_percentage || 0}
                        max="100"
                      />
                      <span className="text-xs font-semibold text-base-content/60">
                        {project.progress_percentage || 0}%
                      </span>
                    </div>
                  </td>

                  <td className="hidden py-4 font-medium text-base-content/80 lg:table-cell">
                    ${Number(project.budget || 0).toLocaleString()}
                  </td>

                  <td className="py-4">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-base-content/70 bg-base-200/60 px-2.5 py-1 rounded-lg">
                      <Users size={13} />
                      {project.members_count || 0}
                    </span>
                  </td>

                  <td className="py-4 text-xs text-base-content/60">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-base-content/40" />
                      <span>{formattedDate}</span>
                    </div>
                  </td>

                  {canManage && (
                    <td
                      className="py-4 pe-6 text-end"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onEdit?.(project)}
                          className="btn btn-ghost btn-square btn-sm rounded-lg text-base-content/60 hover:text-primary"
                          aria-label={`Edit ${project.name}`}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete?.(project.id)}
                          className="btn btn-ghost btn-square btn-sm rounded-lg text-base-content/60 hover:text-error"
                          aria-label={`Delete ${project.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
