import { AnimatePresence, motion } from "motion/react";
import { Add, CloseCircle, Edit2, Folder2, People, Trash } from "iconsax-reactjs";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { createOrganization, deleteOrganization, getOrganizations, updateOrganization } from "../api/organizationsApi";
import type { Organization, OrganizationPayload, OrganizationStatus } from "../types";

const statusOptions: Array<{ value: OrganizationStatus; label: string }> = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "archived", label: "Archived" },
];

const statusStyles: Record<OrganizationStatus, string> = {
  active: "bg-success/12 text-success",
  suspended: "bg-warning/15 text-warning",
  archived: "bg-base-200 text-base-content/55",
};

const statusLabels: Record<OrganizationStatus, string> = {
  active: "Active",
  suspended: "Suspended",
  archived: "Archived",
};

const emptyForm = (): OrganizationPayload => ({ name: "", slug: "", description: "", status: "active" });

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

function OrganizationFormModal({
  organization,
  onClose,
  onSubmit,
  isPending,
}: {
  organization: Organization | null;
  onClose: () => void;
  onSubmit: (payload: OrganizationPayload) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<OrganizationPayload>(() =>
    organization
      ? {
          name: organization.name,
          slug: organization.slug,
          description: organization.description || "",
          status: organization.status,
        }
      : emptyForm(),
  );

  useEffect(() => {
    setForm(
      organization
        ? {
            name: organization.name,
            slug: organization.slug,
            description: organization.description || "",
            status: organization.status,
          }
        : emptyForm(),
    );
  }, [organization]);

  const setField = <K extends keyof OrganizationPayload>(field: K, value: OrganizationPayload[K]) =>
    setForm((current) => ({ ...current, [field]: value }));

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="madaar-surface max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-[28px] border border-base-content/10 bg-base-100 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="organization-modal-title"
      >
        <header className="flex items-start justify-between border-b border-base-content/10 p-6 sm:p-7">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">Organization setup</p>
            <h2 id="organization-modal-title" className="text-2xl font-semibold tracking-tight">{organization ? "Edit organization" : "Create an organization"}</h2>
            <p className="mt-1 text-sm text-base-content/55">Projects, teams and members will live inside this space.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-base-content/50 transition hover:bg-base-200 hover:text-base-content" aria-label="Close organization form"><CloseCircle size={22} /></button>
        </header>

        <form className="space-y-5 p-6 sm:p-7" onSubmit={(event) => { event.preventDefault(); onSubmit({ ...form, name: form.name.trim(), slug: form.slug?.trim() || undefined, description: form.description?.trim() || "" }); }}>
          <label className="form-control"><span className="mb-2 text-sm font-medium">Organization name <span className="text-error">*</span></span><input required autoFocus value={form.name} onChange={(event) => setField("name", event.target.value)} className="input input-bordered w-full rounded-xl bg-base-200/60" placeholder="e.g. Madaar Studio" /></label>
          <label className="form-control"><span className="mb-2 text-sm font-medium">Slug <span className="text-xs font-normal text-base-content/45">(optional)</span></span><input value={form.slug || ""} onChange={(event) => setField("slug", event.target.value.toLowerCase().replace(/\s+/g, "-"))} className="input input-bordered w-full rounded-xl bg-base-200/60" placeholder="madaar-studio" /><span className="mt-1 text-xs text-base-content/45">Leave blank to generate it from the organization name.</span></label>
          <label className="form-control"><span className="mb-2 text-sm font-medium">Description</span><textarea value={form.description} onChange={(event) => setField("description", event.target.value)} className="textarea textarea-bordered min-h-28 resize-y rounded-xl bg-base-200/60" placeholder="What does this organization do?" /></label>
          {organization && <label className="form-control"><span className="mb-2 text-sm font-medium">Status</span><select value={form.status} onChange={(event) => setField("status", event.target.value as OrganizationStatus)} className="select select-bordered rounded-xl bg-base-200/60">{statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>}
          <div className="flex flex-col-reverse gap-3 border-t border-base-content/10 pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="btn btn-ghost rounded-xl">Cancel</button><button type="submit" disabled={isPending || !form.name.trim()} className="btn btn-primary rounded-xl px-6">{isPending ? <span className="loading loading-spinner loading-sm" /> : organization ? "Save changes" : "Create organization"}</button></div>
        </form>
      </motion.div>
    </div>
  );
}

export default function OrganizationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modalOrganization, setModalOrganization] = useState<Organization | null | undefined>(undefined);
  const organizationsQuery = useQuery({ queryKey: ["organizations"], queryFn: getOrganizations });

  const saveMutation = useMutation({
    mutationFn: ({ organization, payload }: { organization: Organization | null; payload: OrganizationPayload }) => organization ? updateOrganization(organization.id, payload) : createOrganization(payload),
    onSuccess: (_organization, variables) => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["project-organizations"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setModalOrganization(undefined);
      toast.success(variables.organization ? "Organization updated" : "Organization created");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Could not save the organization.")),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOrganization,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["project-organizations"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Organization removed");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Could not remove the organization.")),
  });

  const organizations = useMemo(() => organizationsQuery.data || [], [organizationsQuery.data]);
  const summary = useMemo(() => ({
    projects: organizations.reduce((total, organization) => total + (organization.project_count || 0), 0),
    members: organizations.reduce((total, organization) => total + (organization.member_count || 0), 0),
  }), [organizations]);

  const removeOrganization = (organization: Organization) => {
    if (window.confirm(`Remove ${organization.name}? This will hide it and its projects from the workspace.`)) deleteMutation.mutate(organization.id);
  };

  return (
    <div className="min-h-[calc(100vh-121px)] space-y-6 pb-10">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div><div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary"><People size={16} /> Organization</div><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Organizations</h1><p className="mt-2 max-w-2xl text-base-content/60">Create the spaces where your projects, teams and people come together.</p></div>
        <button type="button" onClick={() => setModalOrganization(null)} className="btn btn-primary rounded-xl px-5 shadow-lg shadow-primary/15"><Add size={18} /> New organization</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3"><div className="madaar-surface rounded-2xl border border-base-content/10 bg-base-100 p-5"><p className="text-xs font-semibold uppercase tracking-wider text-base-content/45">Organizations</p><p className="mt-2 text-3xl font-semibold tracking-tight">{organizations.length}</p></div><div className="madaar-surface rounded-2xl border border-base-content/10 bg-base-100 p-5"><p className="text-xs font-semibold uppercase tracking-wider text-base-content/45">Projects inside</p><p className="mt-2 text-3xl font-semibold tracking-tight text-primary">{summary.projects}</p></div><div className="madaar-surface rounded-2xl border border-base-content/10 bg-base-100 p-5"><p className="text-xs font-semibold uppercase tracking-wider text-base-content/45">Members</p><p className="mt-2 text-3xl font-semibold tracking-tight text-success">{summary.members}</p></div></div>

      <div className="rounded-2xl border border-primary/15 bg-primary/5 px-5 py-4 text-sm leading-6 text-base-content/70"><strong className="text-base-content">Next step:</strong> after creating an organization, open Projects to create the project containers your team will work in.</div>

      {organizationsQuery.isLoading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-56 animate-pulse rounded-2xl bg-base-200/70" />)}</div> : organizationsQuery.isError ? <div className="madaar-surface rounded-2xl border border-error/20 bg-error/5 p-8 text-center"><p className="font-semibold text-error">Organizations could not be loaded.</p><button type="button" onClick={() => organizationsQuery.refetch()} className="btn btn-sm btn-ghost mt-3 rounded-lg">Try again</button></div> : organizations.length === 0 ? <div className="madaar-surface rounded-[28px] border border-dashed border-base-content/15 bg-base-100 px-6 py-16 text-center"><div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary"><People size={28} /></div><h2 className="text-xl font-semibold">Create your first organization</h2><p className="mx-auto mt-2 max-w-md text-sm text-base-content/55">An organization is the foundation for projects, people and team workflows.</p><button type="button" onClick={() => setModalOrganization(null)} className="btn btn-primary mt-6 rounded-xl"><Add size={18} /> Create organization</button></div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><AnimatePresence mode="popLayout">{organizations.map((organization) => <motion.article layout key={organization.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} className="madaar-surface rounded-2xl border border-base-content/10 bg-base-100 p-5 transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5"><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><People size={21} /></span><div className="min-w-0"><h2 className="truncate text-lg font-semibold">{organization.name}</h2><p className="truncate text-xs text-base-content/45">/{organization.slug}</p></div></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusStyles[organization.status]}`}>{statusLabels[organization.status]}</span></div><p className="mt-5 min-h-10 line-clamp-2 text-sm leading-6 text-base-content/60">{organization.description || "No description added yet."}</p><div className="mt-5 grid grid-cols-3 gap-3 border-y border-base-content/10 py-4 text-sm"><div><p className="text-xs text-base-content/45">Members</p><p className="mt-1 font-semibold">{organization.member_count || 0}</p></div><div><p className="text-xs text-base-content/45">Teams</p><p className="mt-1 font-semibold">{organization.team_count || 0}</p></div><div><p className="text-xs text-base-content/45">Projects</p><p className="mt-1 font-semibold">{organization.project_count || 0}</p></div></div><div className="mt-4 flex items-center justify-between gap-3"><button type="button" onClick={() => navigate("/projects")} className="btn btn-ghost btn-sm rounded-lg text-primary"><Folder2 size={15} /> Projects</button><div className="flex items-center gap-1"><button type="button" onClick={() => setModalOrganization(organization)} className="btn btn-ghost btn-square btn-sm rounded-lg" aria-label={`Edit ${organization.name}`}><Edit2 size={16} /></button><button type="button" onClick={() => removeOrganization(organization)} disabled={deleteMutation.isPending} className="btn btn-ghost btn-square btn-sm rounded-lg text-error/70" aria-label={`Remove ${organization.name}`}><Trash size={16} /></button></div></div></motion.article>)}</AnimatePresence></div>}

      {modalOrganization !== undefined && <OrganizationFormModal organization={modalOrganization} onClose={() => setModalOrganization(undefined)} onSubmit={(payload) => saveMutation.mutate({ organization: modalOrganization, payload })} isPending={saveMutation.isPending} />}
    </div>
  );
}
