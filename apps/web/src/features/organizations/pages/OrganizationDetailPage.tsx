import { AnimatePresence, motion } from "motion/react";
import {
  Add,
  ArrowLeft,
  Briefcase,
  FolderFavorite,
  People,
  Profile2User,
  Shield,
  User,
  Trash,
} from "iconsax-reactjs";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useParams, useNavigate } from "react-router-dom";
import {
  getOrganizationDetails,
  getMembers,
  removeMember,
} from "../api/organizationsApi";
import { CreateOrgMemberModal } from "../components/CreateOrgMemberModal";
import type { OrganizationMember } from "../types";
import { teamsApi } from "../../teams/api/teamsApi";
import * as projectsApi from "../../projects/api/projectsApi";
import { CreateEditTeamModal } from "../../teams/components/CreateEditTeamModal";
import { CreateEditProjectModal } from "../../projects/components/CreateEditProjectModal";
import type { TeamWithDetails } from "../../teams/types";
import type { Project } from "../../projects/types";

const getUserDisplayName = (member: OrganizationMember): string => {
  const fullName = member.full_name?.trim();
  if (fullName) return fullName;
  return member.username || member.email || "Member";
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (name[0] || "?").toUpperCase();
};

export default function OrganizationDetailPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCreateMemberOpen, setIsCreateMemberOpen] = useState(false);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<OrganizationMember | null>(null);

  const { data: organization, isLoading: isOrgLoading } = useQuery({
    queryKey: ["organizations", orgId],
    queryFn: () => getOrganizationDetails(orgId!),
    enabled: Boolean(orgId),
  });

  const { data: members = [], isLoading: isMembersLoading } = useQuery({
    queryKey: ["organization-members", orgId],
    queryFn: () => getMembers(orgId!),
    enabled: Boolean(orgId),
  });

  const { data: teams = [], isLoading: isTeamsLoading } = useQuery<TeamWithDetails[]>({
    queryKey: ["teams", { organization_id: orgId }],
    queryFn: async () => {
      const response = await teamsApi.getTeams({ organization_id: orgId });
      return response.data?.results ?? [];
    },
    enabled: Boolean(orgId),
  });

  const { data: projects = [], isLoading: isProjectsLoading } = useQuery<Project[]>({
    queryKey: ["projects", { organization: orgId }],
    queryFn: () =>
      projectsApi.getProjects({ organization: orgId } as Parameters<
        typeof projectsApi.getProjects
      >[0]),
    enabled: Boolean(orgId),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeMember(orgId!, userId),
    onSuccess: () => {
      toast.success("Member removed successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to remove member");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-members", orgId] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["organizations", orgId] });
      setMemberToRemove(null);
    },
  });

  if (isOrgLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-base-200/70" />
        <div className="h-6 w-48 animate-pulse rounded-lg bg-base-200/70" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-32 animate-pulse rounded-2xl bg-base-200/70"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="madaar-surface mx-6 mt-6 rounded-2xl border border-error/20 bg-error/5 p-8 text-center">
        <p className="font-semibold text-error">
          Organization could not be loaded.
        </p>
        <button
          type="button"
          onClick={() => navigate("/organizations")}
          className="btn btn-ghost btn-sm mt-3 rounded-lg"
        >
          Back to organizations
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-1 pb-10 sm:px-0">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate("/organizations")}
        className="btn btn-ghost btn-sm rounded-lg gap-2 ps-0 text-base-content/60 hover:bg-base-200 hover:text-base-content"
      >
        <ArrowLeft size={16} />
        Back to organizations
      </button>

      {/* Organization header */}
      <div className="madaar-surface rounded-[24px] border border-base-content/10 bg-base-100/90 p-5 shadow-madaar-card backdrop-blur-xl sm:p-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <People size={28} />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold tracking-tight">
                {organization.name}
              </h1>
              <p className="mt-1 truncate text-sm text-base-content/45">
                /{organization.slug}
              </p>
              {organization.description && (
                <p className="mt-2 text-sm text-base-content/60">
                  {organization.description}
                </p>
              )}
            </div>
          </div>
          <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:justify-end lg:w-auto">
            <button
              type="button"
              onClick={() => setIsCreateMemberOpen(true)}
              className="btn btn-primary btn-sm rounded-xl gap-2 shadow-sm shadow-primary/15"
            >
              <Add size={16} />
              Create member
            </button>
            <button
              type="button"
              onClick={() => setIsCreateTeamOpen(true)}
              className="btn btn-outline btn-sm rounded-xl gap-2"
            >
              <Profile2User size={16} />
              Create team
            </button>
            <button
              type="button"
              onClick={() => setIsCreateProjectOpen(true)}
              className="btn btn-outline btn-sm rounded-xl gap-2"
            >
              <FolderFavorite size={16} />
              Create project
            </button>
            <button
              type="button"
              onClick={() => navigate(`/organizations/${orgId}/roles`)}
              className="btn btn-outline btn-sm rounded-xl gap-2"
            >
              <Shield size={16} />
              Roles Management
            </button>
          </div>
        </div>
      </div>

      {/* Members section */}
      <div className="madaar-surface rounded-[24px] border border-base-content/10 bg-base-100/90 shadow-madaar-card">
        <div className="flex items-center justify-between border-b border-base-content/10 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <User size={18} className="text-base-content/45" />
            <h2 className="text-lg font-semibold">Members</h2>
            <span className="rounded-full bg-base-200 px-2 py-0.5 text-xs font-medium text-base-content/55">
              {members.length}
            </span>
          </div>
        </div>

        {isMembersLoading ? (
          <div className="grid gap-4 p-5 sm:p-6 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-24 animate-pulse rounded-xl bg-base-200/70"
              />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto mb-3 grid size-12 place-items-center rounded-xl bg-base-200 text-base-content/45">
              <User size={24} />
            </div>
            <p className="text-sm text-base-content/55">
              No members yet. Create the first member for this organization.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 p-5 sm:p-6 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {members.map((member) => (
                <motion.div
                  layout
                  key={member.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="madaar-surface group relative flex items-center gap-4 rounded-2xl border border-base-content/10 bg-base-200/25 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-base-100 hover:shadow-madaar-raised"
                >
                  <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {getInitials(getUserDisplayName(member))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {getUserDisplayName(member)}
                    </p>
                    <p className="truncate text-xs text-base-content/45">
                      {member.email}
                    </p>
                    {member.role_display && (
                      <span className="mt-1 inline-block rounded-full bg-base-200 px-2 py-0.5 text-[10px] font-medium text-base-content/55">
                        {member.role_display}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMemberToRemove(member)}
                    className="btn btn-ghost btn-square btn-sm rounded-xl text-error/60 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-error/10 hover:text-error"
                    title="Remove from organization"
                  >
                    <Trash size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Teams section */}
      <div className="madaar-surface rounded-[24px] border border-base-content/10 bg-base-100/90 shadow-madaar-card">
        <div className="flex items-center justify-between border-b border-base-content/10 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Profile2User size={18} className="text-base-content/45" />
            <h2 className="text-lg font-semibold">Teams</h2>
            <span className="rounded-full bg-base-200 px-2 py-0.5 text-xs font-medium text-base-content/55">
              {teams.length}
            </span>
          </div>
        </div>
        {isTeamsLoading ? (
          <div className="grid gap-4 p-5 sm:p-6 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-32 animate-pulse rounded-xl bg-base-200/70" />
            ))}
          </div>
        ) : teams.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto mb-3 grid size-12 place-items-center rounded-xl bg-base-200 text-base-content/45">
              <Profile2User size={24} />
            </div>
            <p className="text-sm text-base-content/55">No teams found in this organization</p>
          </div>
        ) : (
          <div className="grid gap-4 p-5 sm:p-6 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {teams.map((team) => {
                const leader = team.leader_details;
                const memberCount = (team as TeamWithDetails & { member_count?: number; members_count?: number }).member_count
                  ?? (team as TeamWithDetails & { members_count?: number }).members_count;
                return (
                  <motion.div
                    layout
                    key={team.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="madaar-surface rounded-2xl border border-base-content/10 bg-base-200/25 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-base-100 hover:shadow-madaar-raised"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{team.name}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-base-content/50">
                          {team.description || "No description provided"}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        team.is_active ? "bg-success/10 text-success" : "bg-base-200 text-base-content/50"
                      }`}>
                        {team.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-base-content/50">
                      <span>
                        Leader: {leader ? `${leader.first_name} ${leader.last_name}`.trim() : "Unassigned"}
                      </span>
                      {memberCount !== undefined && <span>{memberCount} members</span>}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Projects section */}
      <div className="madaar-surface rounded-[24px] border border-base-content/10 bg-base-100/90 shadow-madaar-card">
        <div className="flex items-center justify-between border-b border-base-content/10 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Briefcase size={18} className="text-base-content/45" />
            <h2 className="text-lg font-semibold">Projects</h2>
            <span className="rounded-full bg-base-200 px-2 py-0.5 text-xs font-medium text-base-content/55">
              {projects.length}
            </span>
          </div>
        </div>
        {isProjectsLoading ? (
          <div className="grid gap-4 p-5 sm:p-6 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-36 animate-pulse rounded-xl bg-base-200/70" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto mb-3 grid size-12 place-items-center rounded-xl bg-base-200 text-base-content/45">
              <FolderFavorite size={24} />
            </div>
            <p className="text-sm text-base-content/55">No projects found in this organization</p>
          </div>
        ) : (
          <div className="grid gap-4 p-5 sm:p-6 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {projects.map((project) => (
                <motion.div
                  layout
                  key={project.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="madaar-surface rounded-xl border border-base-content/10 bg-base-100 p-4 transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="truncate text-sm font-semibold">{project.name}</p>
                    <span className="badge badge-sm shrink-0 capitalize">{project.status_display || project.status}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-base-content/55">
                    {project.description || "No description provided"}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-xs text-base-content/50">
                    <span>{project.deadline ? `Due ${new Date(project.deadline).toLocaleDateString()}` : "No deadline"}</span>
                    {project.progress_percentage !== undefined && <span>{project.progress_percentage}% complete</span>}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {isCreateMemberOpen && (
        <CreateOrgMemberModal
          orgId={orgId!}
          isOpen={isCreateMemberOpen}
          onClose={() => setIsCreateMemberOpen(false)}
        />
      )}
      <CreateEditTeamModal
        isOpen={isCreateTeamOpen}
        onClose={() => setIsCreateTeamOpen(false)}
        organizationId={orgId!}
      />
      <CreateEditProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        project={null}
      />

      {/* Remove Confirmation Dialog */}
      <AnimatePresence>
        {memberToRemove && (
          <motion.div
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1 },
            }}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 backdrop-blur-md sm:p-4"
            onClick={() => setMemberToRemove(null)}
          >
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 30, scale: 0.98 },
                visible: { opacity: 1, y: 0, scale: 1 },
                exit: { opacity: 0, y: 30, scale: 0.98 },
              }}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="madaar-surface w-full max-w-md rounded-[24px] border border-base-content/10 bg-base-100/95 p-5 shadow-madaar-floating backdrop-blur-xl sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-error/10 text-error">
                  <Trash size={28} />
                </div>
                <h3 className="text-lg font-bold text-base-content">
                  Remove Member
                </h3>
                <p className="mt-2 text-sm text-base-content/60">
                  Are you sure you want to remove{" "}
                  <span className="font-semibold">
                    {getUserDisplayName(memberToRemove)}
                  </span>{" "}
                  from this organization? This action cannot be undone.
                </p>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setMemberToRemove(null)}
                  className="btn btn-ghost rounded-xl"
                  disabled={removeMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    removeMutation.mutate(String(memberToRemove.user_id))
                  }
                  disabled={removeMutation.isPending}
                  className="btn btn-error rounded-xl px-6"
                >
                  {removeMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="loading loading-spinner loading-sm"></span>
                      Removing...
                    </span>
                  ) : (
                    "Remove"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
