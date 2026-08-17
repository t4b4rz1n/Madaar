import { AnimatePresence, motion } from "motion/react";
import {
  Add,
  Archive,
  ArrowRight2,
  Calendar1,
  CloseCircle,
  Edit2,
  FolderOpen,
  SearchNormal1,
  TickCircle,
} from "iconsax-reactjs";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getOrganizationsForProjects, archiveProject, completeProject, createProject, getProjects, updateProject } from "../api/projectsApi";
import type { Project, ProjectPayload, ProjectStatus } from "../types";
import { useTaskStore } from "../../tasks/store/useTaskStore";

const statuses: Array<{ value: ProjectStatus | ""; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "on_hold", label: "On hold" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

const statusStyles: Record<ProjectStatus, string> = {
  active: "bg-success/12 text-success",
  draft: "bg-base-200 text-base-content/65",
  on_hold: "bg-warning/15 text-warning",
  completed: "bg-info/12 text-info",
  archived: "bg-error/10 text-error",
};

const statusLabels: Record<ProjectStatus, string> = {
  active: "Active",
  draft: "Draft",
  on_hold: "On hold",
  completed: "Completed",
  archived: "Archived",
};

const emptyForm = (organizationId = ""): ProjectPayload => ({
  name: "",
  description: "",
  organization_id: organizationId,
  status: "draft",
  budget: "",
  budget_currency: "IRR",
  start_date: "",
  deadline: "",
});

const getErrorMessage = (error: any, fallback: string) => {
  const data = error?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.message === "string") return data.message;
  if (data && typeof data === "object") {
    const first = Object.values(data).flat()[0];
    if (typeof first === "string") return first;
  }
  return fallback;
};

const formatDate = (value?: string | null) => {
  if (!value) return "No deadline";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
};

function ProjectFormModal({
  project,
  organizationId,
  onClose,
  onSubmit,
  isPending,
}: {
  project: Project | null;
  organizationId: string;
  onClose: () => void;
  onSubmit: (payload: ProjectPayload) => void;
  isPending: boolean;
}) {
  const { data: organizations = [] } = useQuery({
    queryKey: ["project-organizations"],
    queryFn: getOrganizationsForProjects,
    enabled: !project,
  });
  const [form, setForm] = useState<ProjectPayload>(() =>
    project
      ? {
          name: project.name,
          description: project.description || "",
          organization_id: project.organization.id,
          status: project.status,
          budget: project.budget == null ? "" : String(project.budget),
          budget_currency: project.budget_currency || "IRR",
          start_date: project.start_date || "",
          deadline: project.deadline || "",
        }
      : emptyForm(organizationId),
  );

  useEffect(() => {
    if (!project && !form.organization_id && organizations[0]) {
      setForm((current) => ({ ...current, organization_id: organizations[0].id }));
    }
  }, [form.organization_id, organizations, project]);

  const setField = <K extends keyof ProjectPayload>(field: K, value: ProjectPayload[K]) =>
    setForm((current) => ({ ...current, [field]: value }));

  const noOrganizations = !project && !organizations.length;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="madaar-surface max-h-[min(760px,calc(100vh-2rem))] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-base-content/10 bg-base-100 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-modal-title"
      >
        <div className="flex items-start justify-between border-b border-base-content/10 p-6 sm:p-7">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">Project workspace</p>
            <h2 id="project-modal-title" className="text-2xl font-semibold tracking-tight text-base-content">
              {project ? "Edit project" : "Create a project"}
            </h2>
            <p className="mt-1 text-sm text-base-content/55">
              {project ? "Keep the plan, dates and lifecycle status up to date." : "Give your team a clear container for work."}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-base-content/50 transition hover:bg-base-200 hover:text-base-content" aria-label="Close project form">
            <CloseCircle size={22} />
          </button>
        </div>

        <form
          className="space-y-5 p-6 sm:p-7"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit({
              ...form,
              name: form.name.trim(),
              description: form.description?.trim() || "",
              budget: form.budget || null,
              start_date: form.start_date || null,
              deadline: form.deadline || null,
            });
          }}
        >
          <div className="grid gap-5 sm:grid-cols-[1fr_180px]">
            <label className="form-control">
              <span className="mb-2 text-sm font-medium text-base-content">Project name <span className="text-error">*</span></span>
              <input required autoFocus value={form.name} onChange={(event) => setField("name", event.target.value)} className="input input-bordered w-full rounded-xl bg-base-200/60" placeholder="e.g. Website refresh" />
            </label>
            <label className="form-control">
              <span className="mb-2 text-sm font-medium text-base-content">Status</span>
              <select value={form.status} onChange={(event) => setField("status", event.target.value as ProjectStatus)} className="select select-bordered w-full rounded-xl bg-base-200/60">
                {statuses.slice(1).map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
              </select>
            </label>
          </div>

          {!project && (
            <label className="form-control">
              <span className="mb-2 text-sm font-medium text-base-content">Organization <span className="text-error">*</span></span>
              <select required value={form.organization_id} onChange={(event) => setField("organization_id", event.target.value)} className="select select-bordered w-full rounded-xl bg-base-200/60" disabled={noOrganizations}>
                <option value="">Select an organization</option>
                {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
              </select>
              {noOrganizations && <span className="mt-2 text-xs text-warning">You need to belong to an organization before creating a project.</span>}
            </label>
          )}

          <label className="form-control">
            <span className="mb-2 text-sm font-medium text-base-content">Description</span>
            <textarea value={form.description} onChange={(event) => setField("description", event.target.value)} className="textarea textarea-bordered min-h-28 resize-y rounded-xl bg-base-200/60" placeholder="What outcome should this project deliver?" />
          </label>

          <div className="grid gap-5 sm:grid-cols-3">
            <label className="form-control">
              <span className="mb-2 text-sm font-medium text-base-content">Start date</span>
              <input type="date" value={form.start_date || ""} onChange={(event) => setField("start_date", event.target.value)} className="input input-bordered rounded-xl bg-base-200/60" />
            </label>
            <label className="form-control">
              <span className="mb-2 text-sm font-medium text-base-content">Deadline</span>
              <input type="date" value={form.deadline || ""} onChange={(event) => setField("deadline", event.target.value)} className="input input-bordered rounded-xl bg-base-200/60" />
            </label>
            <label className="form-control">
              <span className="mb-2 text-sm font-medium text-base-content">Budget</span>
              <div className="join">
                <input type="number" min="0" step="0.01" value={form.budget || ""} onChange={(event) => setField("budget", event.target.value)} className="input input-bordered join-item min-w-0 flex-1 rounded-l-xl bg-base-200/60" placeholder="Optional" />
                <input value={form.budget_currency || "IRR"} onChange={(event) => setField("budget_currency", event.target.value.toUpperCase().slice(0, 10))} className="input input-bordered join-item w-20 rounded-r-xl bg-base-200/60 px-2 text-center text-xs font-semibold" aria-label="Budget currency" />
              </div>
            </label>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-base-content/10 pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="btn btn-ghost rounded-xl">Cancel</button>
            <button type="submit" disabled={isPending || !form.name.trim() || (!project && (!form.organization_id || noOrganizations))} className="btn btn-primary rounded-xl px-6">
              {isPending ? <span className="loading loading-spinner loading-sm" /> : project ? "Save changes" : "Create project"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const setActiveProject = useTaskStore((state) => state.setActiveProject);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "">("");
  const [modalProject, setModalProject] = useState<Project | null | undefined>(undefined);

  const projectsQuery = useQuery({
    queryKey: ["projects", search, status],
    queryFn: () => getProjects({ search: search || undefined, status: status || undefined }),
  });

  const saveMutation = useMutation({
    mutationFn: ({ project, payload }: { project: Project | null; payload: ProjectPayload }) =>
      project ? updateProject(project.id, payload) : createProject(payload),
    onSuccess: (project, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-organizations"] });
      setModalProject(undefined);
      toast.success(variables.project ? "Project updated" : "Project created");
      if (!variables.project) {
        setActiveProject(project.id);
        navigate("/tasks");
      }
    },
    onError: (error) => toast.error(getErrorMessage(error, "Could not save the project.")),
  });

  const lifecycleMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "archive" | "complete" }) => action === "archive" ? archiveProject(id) : completeProject(id),
    onSuccess: (_project, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success(variables.action === "archive" ? "Project archived" : "Project marked complete");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Could not update project status.")),
  });

  const projects = useMemo(() => projectsQuery.data || [], [projectsQuery.data]);
  const summary = useMemo(() => ({
    active: projects.filter((project) => project.status === "active").length,
    openTasks: projects.reduce((total, project) => total + (project.task_count || 0), 0),
  }), [projects]);

  const openWorkspace = (project: Project) => {
    setActiveProject(project.id);
    navigate("/tasks");
  };

  return (
    <div className="min-h-[calc(100vh-121px)] space-y-6 pb-10">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary"><FolderOpen size={16} /> Workspace</div>
          <h1 className="text-3xl font-semibold tracking-tight text-base-content sm:text-4xl">Projects</h1>
          <p className="mt-2 max-w-2xl text-base-content/60">One calm place to organize delivery, teams and the work behind every outcome.</p>
        </div>
        <button type="button" onClick={() => setModalProject(null)} className="btn btn-primary rounded-xl px-5 shadow-lg shadow-primary/15"><Add size={18} /> New project</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="madaar-surface rounded-2xl border border-base-content/10 bg-base-100 p-5"><p className="text-xs font-semibold uppercase tracking-wider text-base-content/45">Total projects</p><p className="mt-2 text-3xl font-semibold tracking-tight">{projects.length}</p></div>
        <div className="madaar-surface rounded-2xl border border-base-content/10 bg-base-100 p-5"><p className="text-xs font-semibold uppercase tracking-wider text-base-content/45">Active now</p><p className="mt-2 text-3xl font-semibold tracking-tight text-success">{summary.active}</p></div>
        <div className="madaar-surface rounded-2xl border border-base-content/10 bg-base-100 p-5"><p className="text-xs font-semibold uppercase tracking-wider text-base-content/45">Tracked tasks</p><p className="mt-2 text-3xl font-semibold tracking-tight text-primary">{summary.openTasks}</p></div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative block flex-1">
          <SearchNormal1 size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base-content/40" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects..." className="input input-bordered w-full rounded-xl bg-base-100 pl-11" aria-label="Search projects" />
        </label>
        <select value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus | "")} className="select select-bordered rounded-xl bg-base-100 sm:w-48" aria-label="Filter projects by status">
          {statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </div>

      {projectsQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-64 animate-pulse rounded-2xl bg-base-200/70" />)}</div>
      ) : projectsQuery.isError ? (
        <div className="madaar-surface rounded-2xl border border-error/20 bg-error/5 p-8 text-center"><p className="font-semibold text-error">Projects could not be loaded.</p><button type="button" onClick={() => projectsQuery.refetch()} className="btn btn-sm btn-ghost mt-3 rounded-lg">Try again</button></div>
      ) : projects.length === 0 ? (
        <div className="madaar-surface rounded-[28px] border border-dashed border-base-content/15 bg-base-100 px-6 py-16 text-center"><div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary"><FolderOpen size={28} /></div><h2 className="text-xl font-semibold">No projects yet</h2><p className="mx-auto mt-2 max-w-md text-sm text-base-content/55">Create the first project and it will immediately become available in the Tasks workspace.</p><button type="button" onClick={() => setModalProject(null)} className="btn btn-primary mt-6 rounded-xl"><Add size={18} /> Create your first project</button></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {projects.map((project) => (
              <motion.article layout key={project.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} className="madaar-surface group rounded-2xl border border-base-content/10 bg-base-100 p-5 transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5">
                <div className="flex items-start justify-between gap-4">
                  <button type="button" onClick={() => openWorkspace(project)} className="flex min-w-0 items-center gap-3 text-left" aria-label={`Open ${project.name} in Tasks`}>
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><FolderOpen size={21} /></span>
                    <span className="min-w-0"><span className="block truncate text-lg font-semibold text-base-content">{project.name}</span><span className="mt-0.5 block truncate text-xs text-base-content/45">{project.organization?.name || "Organization"}</span></span>
                  </button>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusStyles[project.status]}`}>{statusLabels[project.status]}</span>
                </div>
                <p className="mt-5 min-h-10 line-clamp-2 text-sm leading-6 text-base-content/60">{project.description || "No description added yet."}</p>
                <div className="mt-5 grid grid-cols-2 gap-3 border-y border-base-content/10 py-4 text-sm"><div><p className="text-xs text-base-content/45">Tasks</p><p className="mt-1 font-semibold">{project.task_count || 0}</p></div><div><p className="text-xs text-base-content/45">Members</p><p className="mt-1 font-semibold">{project.member_count || 0}</p></div></div>
                <div className="mt-4 flex items-center justify-between gap-3"><span className="flex items-center gap-1.5 text-xs text-base-content/50"><Calendar1 size={14} /> {formatDate(project.deadline)}</span><div className="flex items-center gap-1"><button type="button" onClick={() => openWorkspace(project)} className="btn btn-ghost btn-sm rounded-lg text-primary">Open <ArrowRight2 size={14} /></button><button type="button" onClick={() => setModalProject(project)} className="btn btn-ghost btn-square btn-sm rounded-lg" aria-label={`Edit ${project.name}`}><Edit2 size={16} /></button>{project.status !== "completed" && project.status !== "archived" && <button type="button" onClick={() => lifecycleMutation.mutate({ id: project.id, action: "complete" })} className="btn btn-ghost btn-square btn-sm rounded-lg text-success" aria-label={`Complete ${project.name}`}><TickCircle size={16} /></button>}{project.status !== "archived" && <button type="button" onClick={() => lifecycleMutation.mutate({ id: project.id, action: "archive" })} className="btn btn-ghost btn-square btn-sm rounded-lg text-base-content/45" aria-label={`Archive ${project.name}`}><Archive size={16} /></button>}</div></div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      )}

      {modalProject !== undefined && <ProjectFormModal project={modalProject} organizationId="" onClose={() => setModalProject(undefined)} onSubmit={(payload) => saveMutation.mutate({ project: modalProject, payload })} isPending={saveMutation.isPending} />}
    </div>
  );
}
