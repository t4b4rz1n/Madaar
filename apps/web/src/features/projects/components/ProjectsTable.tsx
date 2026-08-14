import React from "react";
import { Users, Edit2, Trash2, FolderDot, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Project } from "../types";

interface ProjectsTableProps {
  projects: Project[];
  isLoading: boolean;
  onEdit?: (project: Project) => void;
  onDelete?: (id: string | number) => void;
  canManage?: boolean;
}

export const ProjectsTable: React.FC<ProjectsTableProps> = ({
  projects,
  isLoading,
  onEdit,
  onDelete,
  canManage = true,
}) => {
  const navigate = useNavigate();

  const getStatusDisplay = (status: Project["status"]) => {
    switch (status) {
      case "draft":
        return { color: "bg-base-300 text-base-content/70", text: "Draft" };
      case "active":
        return { color: "bg-info/15 text-info", text: "Active" };
      case "on_hold":
        return { color: "bg-warning/15 text-warning", text: "On Hold" };
      case "completed":
        return { color: "bg-success/15 text-success", text: "Completed" };
      case "archived":
        return { color: "bg-neutral/15 text-neutral", text: "Archived" };
      default:
        return { color: "bg-base-300 text-base-content", text: "Draft" };
    }
  };

  if (isLoading) {
    return (
      <div className="bg-base-100 border border-base-300 rounded-2xl p-4">
        <div className="skeleton h-64 w-full rounded-xl bg-base-200/50"></div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-base-content/40 bg-base-100 border border-base-300 rounded-2xl">
        <FolderDot size={48} className="mb-4 opacity-20" />
        <p>No projects found.</p>
      </div>
    );
  }

  return (
    <div className="bg-base-100 border border-base-300 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead className="bg-base-200/50 text-base-content/70 text-xs font-semibold uppercase">
            <tr>
              <th className="py-4 ps-6">Project Name</th>
              <th className="py-4">Status</th>
              <th className="py-4">Progress</th>
              <th className="py-4">Budget</th>
              <th className="py-4">Members</th>
              <th className="py-4">Due Date</th>
              {canManage && <th className="py-4 pe-6 text-end">Actions</th>}
            </tr>
          </thead>

          <tbody className="divide-y divide-base-200 text-sm">
            {projects.map((project) => {
              const statusInfo = getStatusDisplay(project.status);
              const formattedDate = project.deadline
                ? new Date(project.deadline).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "No deadline";

              return (
                <tr
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="hover:bg-base-200/40 transition-colors cursor-pointer group"
                >
                  <td className="py-4 ps-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 group-hover:scale-105 transition-transform">
                        <FolderDot size={20} />
                      </div>
                      <div className="max-w-xs">
                        <div className="font-bold text-base-content truncate group-hover:text-primary transition-colors">
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
                      className={`text-[11px] px-2.5 py-1 rounded-full font-medium inline-block ${statusInfo.color}`}
                    >
                      {statusInfo.text}
                    </span>
                  </td>

                  <td className="py-4 w-44">
                    <div className="flex items-center gap-3">
                      <progress
                        className="progress progress-primary w-24 h-1.5 bg-base-300"
                        value={project.progress_percentage || 0}
                        max="100"
                      />
                      <span className="text-xs text-base-content/60 font-medium">
                        {project.progress_percentage || 0}%
                      </span>
                    </div>
                  </td>

                  <td className="py-4 font-medium text-base-content/80">
                    ${project.budget?.toLocaleString() || "0"}
                  </td>

                  <td className="py-4">
                    <span className="inline-flex items-center gap-1.5 text-xs text-base-content/70 font-medium bg-base-200 px-2.5 py-1 rounded-full">
                      <Users size={12} />
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
                    >
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEdit?.(project)}
                          className="btn btn-ghost btn-xs btn-square text-base-content/50 hover:text-primary hover:bg-primary/10 rounded-lg"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => onDelete?.(project.id)}
                          className="btn btn-ghost btn-xs btn-square text-base-content/50 hover:text-error hover:bg-error/10 rounded-lg"
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
