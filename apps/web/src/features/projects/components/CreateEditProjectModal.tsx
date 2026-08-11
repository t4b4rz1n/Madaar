import React, { useEffect, useState } from "react";
import { CloseSquare } from "iconsax-reactjs";
import type { Project, CreateProjectDTO } from "../types";
import { useCreateProject, useUpdateProject } from "../hooks/useProjects";

interface CreateEditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
}

export const CreateEditProjectModal: React.FC<CreateEditProjectModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    budget: "",
    start_date: "",
    end_date: "",
    status: "planning" as Project["status"],
  });

  // Load project data when editing, or reset form when creating
  useEffect(() => {
    if (project) {
      setFormData({
        title: project.title || "",
        description: project.description || "",
        budget: project.budget ? String(project.budget) : "",
        start_date: project.start_date ? project.start_date.split("T")[0] : "",
        end_date: project.end_date ? project.end_date.split("T")[0] : "",
        status: project.status || "planning",
      });
    } else {
      setFormData({
        title: "",
        description: "",
        budget: "",
        start_date: new Date().toISOString().split("T")[0],
        end_date: "",
        status: "planning",
      });
    }
  }, [project, isOpen]);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload: CreateProjectDTO = {
      title: formData.title,
      description: formData.description,
      budget: formData.budget ? Number(formData.budget) : undefined,
      start_date: new Date(formData.start_date).toISOString(),
      end_date: new Date(formData.end_date).toISOString(),
    };

    if (project) {
      // Edit existing project
      updateProjectMutation.mutate(
        {
          id: project.id,
          data: { ...payload, status: formData.status },
        },
        {
          onSuccess: () => {
            onClose();
          },
        },
      );
    } else {
      // Create new project
      createProjectMutation.mutate(payload, {
        onSuccess: () => {
          onClose();
        },
      });
    }
  };

  const isLoading =
    createProjectMutation.isPending || updateProjectMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-300/60 backdrop-blur-sm p-4">
      <div className="bg-base-100 border border-base-content/10 rounded-2xl shadow-2xl w-full max-w-lg p-6 relative animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-base-content/10">
          <h3 className="font-bold text-lg text-base-content">
            {project ? "Edit Project" : "Create New Project"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost text-base-content/60 hover:text-base-content"
          >
            <CloseSquare size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="label text-xs font-semibold text-base-content/70">
              Project Title *
            </label>
            <input
              type="text"
              name="title"
              required
              placeholder="e.g. Modares Internal System"
              value={formData.title}
              onChange={handleChange}
              className="input input-bordered w-full rounded-xl focus:border-primary text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <label className="label text-xs font-semibold text-base-content/70">
              Description *
            </label>
            <textarea
              name="description"
              required
              rows={3}
              placeholder="Brief overview of the project objectives..."
              value={formData.description}
              onChange={handleChange}
              className="textarea textarea-bordered w-full rounded-xl focus:border-primary text-sm"
            />
          </div>

          {/* Budget & Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label text-xs font-semibold text-base-content/70">
                Budget ($)
              </label>
              <input
                type="number"
                name="budget"
                placeholder="e.g. 50000"
                value={formData.budget}
                onChange={handleChange}
                className="input input-bordered w-full rounded-xl focus:border-primary text-sm"
              />
            </div>

            {project && (
              <div>
                <label className="label text-xs font-semibold text-base-content/70">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="select select-bordered w-full rounded-xl text-sm"
                >
                  <option value="planning">Planning</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            )}
          </div>

          {/* Dates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label text-xs font-semibold text-base-content/70">
                Start Date *
              </label>
              <input
                type="date"
                name="start_date"
                required
                value={formData.start_date}
                onChange={handleChange}
                className="input input-bordered w-full rounded-xl focus:border-primary text-sm"
              />
            </div>

            <div>
              <label className="label text-xs font-semibold text-base-content/70">
                Due Date *
              </label>
              <input
                type="date"
                name="end_date"
                required
                value={formData.end_date}
                onChange={handleChange}
                className="input input-bordered w-full rounded-xl focus:border-primary text-sm"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-base-content/10 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="btn btn-ghost rounded-xl border border-base-content/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary rounded-xl"
            >
              {isLoading && (
                <span className="loading loading-spinner loading-xs"></span>
              )}
              {project ? "Save Changes" : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
