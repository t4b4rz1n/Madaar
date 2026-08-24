import React, { useEffect, useState } from "react";
import { CloseCircle, FolderAdd, TickCircle } from "iconsax-reactjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
  { label: "Sky Blue",    value: "#81d4fa" },
  { label: "Sage",        value: "#a5d6a7" },
  { label: "Peach",       value: "#ffcc80" },
  { label: "Mauve",       value: "#ce93d8" },
  { label: "Dusty Blue",  value: "#90caf9" },
  { label: "Rose Quartz", value: "#ef9a9a" },
  { label: "Clay",        value: "#bcaaa4" },
  { label: "Indigo",      value: "#6366f1" },
];

const sanitizeColor = (colorStr?: string | null): string => {
  if (!colorStr) return PROJECT_COLORS[0].value;
  if (colorStr.length <= 20) return colorStr;
  const hexMatch = colorStr.match(/#[0-9a-fA-F]{3,8}/);
  if (hexMatch) return hexMatch[0];
  return PROJECT_COLORS[0].value;
};

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
    status: "active" as ProjectStatus,
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
        color: sanitizeColor(project.color),
        budget: project.budget ? String(project.budget) : "",
        budget_currency: project.budget_currency || "IRR",
        start_date: project.start_date ? project.start_date.split("T")[0] : "",
        deadline: project.deadline ? project.deadline.split("T")[0] : "",
        status: project.status || "active",
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
        status: "active",
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
      toast.error("Please select an organization first.");
      return;
    }

    const payload: CreateProjectDTO = {
      name: formData.name,
      organization_id: selectedOrgId,
      description: formData.description || undefined,
      prefix: formData.prefix || undefined,
      color: sanitizeColor(formData.color),
      budget: formData.budget ? Number(formData.budget) : undefined,
      budget_currency: formData.budget_currency,
      start_date: formData.start_date || undefined,
      deadline: formData.deadline || undefined,
    };

    const handleApiError = (err: any) => {
      console.error("Project action error:", err);
      const errorData = err?.response?.data;
      let msg = "Could not save project.";
      if (errorData) {
        if (typeof errorData === "string") msg = errorData;
        else if (errorData.detail) msg = errorData.detail;
        else if (typeof errorData === "object") {
          const firstKey = Object.keys(errorData)[0];
          const firstVal = errorData[firstKey];
          msg = `${firstKey}: ${Array.isArray(firstVal) ? firstVal.join(", ") : firstVal}`;
        }
      }
      toast.error(msg);
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
            toast.success("Project updated successfully");
            onClose();
          },
          onError: handleApiError,
        },
      );
    } else {
      createProjectMutation.mutate(payload, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["projects"] });
          toast.success("Project created successfully");
          onClose();
        },
        onError: handleApiError,
      });
    }
  };

  const isLoading =
    createProjectMutation.isPending || updateProjectMutation.isPending;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 backdrop-blur-xs"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-3xl border border-base-content/10 bg-base-100 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header with live gradient preview */}
        <div
          className="relative flex items-center justify-between px-6 py-5 text-white"
          style={{ background: formData.color }}
        >
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-white/20 backdrop-blur-xs">
              <FolderAdd size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">
                {project ? "Edit Project" : "New Project"}
              </h3>
              <p className="text-xs text-white/80 font-medium">
                {project ? "Update project details and settings" : "Create a new project workspace"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition duration-150"
          >
            <CloseCircle size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {!project && (
            <div>
              <label className="block font-bold text-base-content/60 mb-1 uppercase tracking-wider text-[11px]">
                Organization <span className="text-error">*</span>
              </label>
              <select
                name="organization_id"
                required
                value={formData.organization_id}
                onChange={handleChange}
                disabled={isLoadingOrgs || organizations.length === 0}
                className="w-full h-9.5 rounded-xl border border-base-content/10 bg-base-200/50 px-3 font-semibold text-base-content outline-none focus:border-primary/40 focus:bg-base-100 transition-all"
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
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block font-bold text-base-content/60 mb-1 uppercase tracking-wider text-[11px]">
                Project Name <span className="text-error">*</span>
              </label>
              <input
                type="text"
                name="name"
                dir="auto"
                required
                placeholder="e.g. Madaar System"
                value={formData.name}
                onChange={handleChange}
                className="w-full h-9.5 rounded-xl border border-base-content/10 bg-base-200/50 px-3 font-semibold text-base-content outline-none focus:border-primary/40 focus:bg-base-100 transition-all placeholder:text-base-content/35"
              />
            </div>
            <div>
              <label className="block font-bold text-base-content/60 mb-1 uppercase tracking-wider text-[11px]">
                Key Prefix
              </label>
              <input
                type="text"
                name="prefix"
                maxLength={10}
                placeholder="MAD"
                value={formData.prefix}
                onChange={handleChange}
                className="w-full h-9.5 rounded-xl border border-base-content/10 bg-base-200/50 px-3 font-semibold text-base-content outline-none focus:border-primary/40 focus:bg-base-100 transition-all uppercase placeholder:text-base-content/35"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-base-content/60 mb-1 uppercase tracking-wider text-[11px]">
              Description
            </label>
            <textarea
              name="description"
              dir="auto"
              rows={2}
              placeholder="Brief project summary..."
              value={formData.description}
              onChange={handleChange}
              className="w-full rounded-xl border border-base-content/10 bg-base-200/50 p-3 font-semibold text-base-content outline-none focus:border-primary/40 focus:bg-base-100 transition-all placeholder:text-base-content/35 resize-none"
            />
          </div>

          {/* Color Theme Selector */}
          <div>
            <label className="block font-bold text-base-content/60 mb-2 uppercase tracking-wider text-[11px]">
              Theme Color
            </label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onClick={() => setFormData((prev) => ({ ...prev, color: c.value }))}
                  className={`h-8 w-8 rounded-xl transition-all duration-150 relative flex items-center justify-center ${
                    formData.color === c.value
                      ? "ring-2 ring-primary ring-offset-2 scale-105"
                      : "opacity-80 hover:opacity-100"
                  }`}
                  style={{ background: c.value }}
                >
                  {formData.color === c.value && (
                    <TickCircle size={14} className="text-white" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-base-content/8">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="h-9 px-4 rounded-xl border border-base-content/10 text-xs font-bold text-base-content/70 hover:bg-base-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || (!project && organizations.length === 0)}
              className="h-9 px-5 rounded-xl bg-primary text-xs font-bold text-primary-content shadow-md shadow-primary/15 hover:bg-primary/95 transition-all inline-flex items-center gap-1.5"
            >
              {isLoading ? (
                <span>Saving...</span>
              ) : project ? (
                <span>Save Changes</span>
              ) : (
                <span>Create Project</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
