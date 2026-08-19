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
    budget: "",
    budget_currency: "IRR",
    start_date: "",
    deadline: "",
    status: "draft" as ProjectStatus,
  });

  // 💡 اصلاح جدی: فقط موقعی که مودال باز میشه یا پروژه تغییر میکنه فرم Reset بشه
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
        budget: "",
        budget_currency: "IRR",
        start_date: new Date().toISOString().split("T")[0],
        deadline: "",
        status: "draft",
      });
    }
  }, [project, isOpen]); // 👈 'organizations' از اینجا حذف شد تا حلقه بی‌نهایت ایجاد نکند

  // مقداردهی پیش‌فرض سازمان در صورتی که ساخت پروژه جدید باشد
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
        className="madaar-surface max-h-[min(760px,calc(100vh-2rem))] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-base-content/10 bg-base-100 shadow-2xl animate-in fade-in zoom-in duration-200"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-base-content/10 p-6 sm:p-7">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              Project Workspace
            </p>
            <h3 className="text-2xl font-semibold tracking-tight text-base-content">
              {project ? "Edit Project" : "Create New Project"}
            </h3>
            <p className="mt-1 text-sm text-base-content/55">
              {project
                ? "Keep the plan, dates and lifecycle status up to date."
                : "Give your team a clear container for work."}
            </p>
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