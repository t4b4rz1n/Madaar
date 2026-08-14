import React from "react";
import { Users, Edit2, Trash2, FolderDot, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Project } from "../types";

interface ProjectsGridProps {
  projects: Project[];
  isLoading: boolean;
  onEdit?: (project: Project) => void;
  onDelete?: (id: string | number) => void;
  canManage?: boolean;
}

const ProjectCard: React.FC<{
  project: Project;
  onEdit?: (project: Project) => void;
  onDelete?: (id: string | number) => void;
  canManage?: boolean;
}> = ({ project, onEdit, onDelete, canManage }) => {
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

  const statusInfo = getStatusDisplay(project.status);
  const formattedDate = project.deadline
    ? new Date(project.deadline).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "No deadline";

  return (
    <div
      onClick={() => navigate(`/projects/${project.id}`)}
      className="flex flex-col bg-base-100 border border-base-300 rounded-2xl p-5 hover:border-primary/50 transition-all cursor-pointer group"
    >
      <div className="flex items-center gap-4 mb-5">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 group-hover:scale-105 transition-transform">
          <FolderDot size={24} />
        </div>
        <div className="overflow-hidden">
          <h3 className="text-base font-bold text-base-content truncate group-hover:text-primary transition-colors">
            {project.name}
          </h3>
          <p className="text-sm text-base-content/50 truncate">
            Budget: ${project.budget?.toLocaleString() || "0"}
          </p>
        </div>
      </div>

      <div className="flex flex-col bg-base-200/50 dark:bg-base-200 rounded-xl p-4 mb-5 flex-grow">
        <p className="text-sm text-base-content/70 line-clamp-2 mb-4 h-10">
          {project.description || "No description provided."}
        </p>

        <div className="mt-auto">
          <div className="flex justify-between text-xs text-base-content/60 mb-2 font-medium">
            <span>Progress</span>
            <span>{project.progress_percentage || 0}%</span>
          </div>
          <progress
            className="progress progress-primary w-full h-1.5 bg-base-300"
            value={project.progress_percentage || 0}
            max="100"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-transparent mt-auto">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${statusInfo.color}`}
            >
              {statusInfo.text}
            </span>
            <span className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-base-200 text-base-content/70 font-medium">
              <Users size={12} />
              {project.members_count || 0}
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs text-base-content/50 ms-1">
            <Calendar size={12} />
            <span>Due: {formattedDate}</span>
          </div>
        </div>

        {canManage && (
          <div
            className="flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => onEdit?.(project)}
              className="btn btn-ghost btn-sm btn-square text-base-content/50 hover:text-primary hover:bg-primary/10 rounded-lg"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={() => onDelete?.(project.id)}
              className="btn btn-ghost btn-sm btn-square text-base-content/50 hover:text-error hover:bg-error/10 rounded-lg"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="skeleton h-60 w-full rounded-2xl bg-base-200/50"
          ></div>
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-base-content/40">
        <FolderDot size={48} className="mb-4 opacity-20" />
        <p>No projects found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
