import React, { useEffect, useState } from "react";
import { CloseCircle } from "iconsax-reactjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Project, CreateProjectDTO, ProjectStatus } from "../types";
import { useCreateProject, useUpdateProject } from "../hooks/useProjects";
import { getOrganizationsForProjects } from "../api/projectsApi";

interface CreateEditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
}

const PROJECT_COLORS = [
  { label: "Lavender",    value: "#b39ddb" },
  { label: "Periwinkle",  value: "#9fa8da" },
  { label: "Sky Blue",    value: "#81d4fa" },
  { label: "Mint",        value: "#80cbc4" },
  { label: "Sage",        value: "#a5d6a7" },
  { label: "Pistachio",   value: "#c5e1a5" },
  { label: "Butter",      value: "#fff176" },
  { label: "Peach",       value: "#ffcc80" },
  { label: "Blush",       value: "#f48fb1" },
  { label: "Rose Quartz", value: "#ef9a9a" },
  { label: "Mauve",       value: "#ce93d8" },
  { label: "Dusty Blue",  value: "#90caf9" },
  { label: "Clay",        value: "#bcaaa4" },
  { label: "Sand",        value: "#ffe0b2" },
  { label: "Lilac",       value: "#e1bee7" },
  { label: "Seafoam",     value: "#b2dfdb" },
];

export const CreateEditProjectModal: React.FC<CreateEditProjectModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  const queryClient = useQueryClient();
  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();

  const { data: organizations = [], isLoading: isLoadingOrgs } = useQuery({
    queryKey: ["project-organizations"],
    queryFn: getOrganizationsForProjects,
    enabled: isOpen,
  });

  const [formData, setFormData] = useState({
    name: "",
    organization_id: "",
    description: "",
    prefix: "",
    color: PROJECT_COLORS[0].value,
    budget: "",
    budget_currency: "IRR",
    start_date: "",
    deadline: "",
    status: "draft" as ProjectStatus,
  });

  useEffect(() => {
    if (!isOpen) return;

    if (project) {
      setFormData({
        name: project.name || "",
        organization_id:
          typeof project.organization === "object"
            ? String(project.organization.id)
            : String(project.organization || ""),
        description: project.description || "",
        prefix: project.prefix || "",
        color: project.color || PROJECT_COLORS[0].value,
        budget: project.budget ? String(project.budget) : "",
        budget_currency: project.budget_currency || "IRR",
        start_date: project.start_date ? project.start_date.split("T")[0] : "",
        deadline: project.deadline ? project.deadline.split("T")[0] : "",
        status: project.status || "draft",
      });
    } else {
      setFormData({
        name: "",
        organization_id: "",
        description: "",
        prefix: "",
        color: PROJECT_COLORS[0].value,
        budget: "",
        budget_currency: "IRR",
        start_date: new Date().toISOString().split("T")[0],
        deadline: "",
        status: "draft",
      });
    }
  }, [project, isOpen]);

  useEffect(() => {
    if (isOpen && !project && organizations.length > 0 && !formData.organization_id) {
      setFormData((prev) => ({
        ...prev,
        organization_id: String(organizations[0].id),
      }));
    }
  }, [isOpen, project, organizations, formData.organization_id]);

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

    const selectedOrgId =
      formData.organization_id ||
      (organizations[0]?.id ? String(organizations[0].id) : "");

    if (!project && !selectedOrgId) {
      alert("Please select an organization first.");
      return;
    }

    const payload: CreateProjectDTO = {
      name: formData.name,
      organization_id: selectedOrgId,
      description: formData.description || undefined,
      prefix: formData.prefix || undefined,
      color: formData.color || undefined,
      budget: formData.budget ? Number(formData.budget) : undefined,
      budget_currency: formData.budget_currency,
      start_date: formData.start_date
        ? new Date(formData.start_date).toISOString().split("T")[0]
        : undefined,
      deadline: formData.deadline
        ? new Date(formData.deadline).toISOString().split("T")[0]
        : undefined,
    };

    if (project) {
      updateProjectMutation.mutate(
        {
          id: project.id,
          data: { ...payload, status: formData.status },
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["projects"] });
            onClose();
          },
        },
      );
    } else {
      createProjectMutation.mutate(payload, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["projects"] });
          onClose();
        },
      });
    }
  };

  const isLoading =
    createProjectMutation.isPending || updateProjectMutation.isPending;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="madaar-surface max-h-[min(800px,calc(100vh-2rem))] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-base-content/10 bg-base-100 shadow-2xl animate-in fade-in zoom-in duration-200"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header with color accent */}
        <div
          className="flex items-start justify-between p-6 sm:p-7"
          style={{
            background: `linear-gradient(135deg, ${formData.color}18 0%, transparent 60%)`,
            borderBottom: `3px solid ${formData.color}30`,
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="grid size-12 shrink-0 place-items-center rounded-2xl text-white shadow-lg"
              style={{ background: formData.color }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <p className="mb-0.5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                Project Workspace
              </p>
              <h3 className="text-xl font-semibold tracking-tight text-base-content">
                {project ? "Edit Project" : "Create New Project"}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-base-content/50 transition hover:bg-base-200 hover:text-base-content"
          >
            <CloseCircle size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6 sm:p-7">
          {!project && (
            <div>
              <label className="mb-2 block text-sm font-medium text-base-content">
                Organization <span className="text-error">*</span>
              </label>
              <select
                name="organization_id"
                required
                value={formData.organization_id}
                onChange={handleChange}
                disabled={isLoadingOrgs || organizations.length === 0}
                className="select select-bordered w-full rounded-xl bg-base-200/60"
              >
                {organizations.length === 0 ? (
                  <option value="">No Organizations Found</option>
                ) : (
                  organizations.map((org) => (
                    <option key={org.id} value={String(org.id)}>
                      {org.name}
                    </option>
                  ))
                )}
              </select>
              {organizations.length === 0 && !isLoadingOrgs && (
                <p className="text-error text-xs mt-2">
                  You must create or belong to an organization first.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-base-content">
                Project Name <span className="text-error">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. Modares Internal System"
                value={formData.name}
                onChange={handleChange}
                className="input input-bordered w-full rounded-xl bg-base-200/60"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-base-content">
                Prefix (Key)
              </label>
              <input
                type="text"
                name="prefix"
                maxLength={10}
                placeholder="e.g. MAD"
                value={formData.prefix}
                onChange={handleChange}
                className="input input-bordered w-full rounded-xl bg-base-200/60 uppercase"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-base-content">
              Description
            </label>
            <textarea
              name="description"
              rows={3}
              placeholder="Brief overview of the project objectives..."
              value={formData.description}
              onChange={handleChange}
              className="textarea textarea-bordered w-full min-h-24 rounded-xl bg-base-200/60"
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="mb-3 block text-sm font-medium text-base-content">
              Project Color
              <span className="ms-2 rounded-md px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: formData.color }}>
                {PROJECT_COLORS.find(c => c.value === formData.color)?.label || "Custom"}
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onClick={() => setFormData(prev => ({ ...prev, color: c.value }))}
                  className="group relative size-8 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{
                    background: c.value,
                    boxShadow: formData.color === c.value ? `0 0 0 3px white, 0 0 0 5px ${c.value}` : "none",
                    transform: formData.color === c.value ? "scale(1.15)" : "scale(1)",
                  }}
                >
                  {formData.color === c.value && (
                    <svg className="absolute inset-0 m-auto" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
              {/* Custom color */}
              <label className="relative size-8 cursor-pointer overflow-hidden rounded-full border-2 border-dashed border-base-content/30 transition hover:border-base-content/60" title="Custom color">
                <span className="absolute inset-0 grid place-items-center text-base-content/50 text-xs">+</span>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-base-content">
                Budget
              </label>
              <div className="join w-full">
                <input
                  type="number"
                  name="budget"
                  placeholder="e.g. 500000000"
                  value={formData.budget}
                  onChange={handleChange}
                  className="input input-bordered join-item w-full rounded-l-xl bg-base-200/60"
                />
                <input
                  type="text"
                  name="budget_currency"
                  value={formData.budget_currency}
                  onChange={handleChange}
                  className="input input-bordered join-item w-20 rounded-r-xl bg-base-200/60 px-2 text-center text-xs font-semibold"
                />
              </div>
            </div>

            {project && (
              <div>
                <label className="mb-2 block text-sm font-medium text-base-content">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="select select-bordered w-full rounded-xl bg-base-200/60 capitalize"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-base-content">
                Start Date
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="input input-bordered w-full rounded-xl bg-base-200/60"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-base-content">
                Deadline
              </label>
              <input
                type="date"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                className="input input-bordered w-full rounded-xl bg-base-200/60"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-base-content/10 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="btn btn-ghost rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || (!project && organizations.length === 0)}
              className="btn btn-primary rounded-xl px-6"
              style={{ background: formData.color, borderColor: formData.color }}
            >
              {isLoading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : project ? (
                "Save changes"
              ) : (
                "Create project"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
