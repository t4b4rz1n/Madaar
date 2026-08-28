import { AnimatePresence, motion } from "motion/react";
import { Add, ArrowLeft, People, User, Trash } from "iconsax-reactjs";
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

  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeMember(orgId!, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-members", orgId] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["organizations", orgId] });
      toast.success("Member removed successfully");
      setMemberToRemove(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to remove member");
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
    <div className="p-6">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate("/organizations")}
        className="btn btn-ghost btn-sm mb-6 rounded-lg gap-2 ps-0 text-base-content/60 hover:text-base-content"
      >
        <ArrowLeft size={16} />
        Back to organizations
      </button>

      {/* Organization header */}
      <div className="madaar-surface mb-6 rounded-2xl border border-base-content/10 bg-base-100 p-6">
        <div className="flex items-start justify-between gap-4">
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
          <button
            type="button"
            onClick={() => setIsCreateMemberOpen(true)}
            className="btn btn-primary btn-sm rounded-xl gap-2"
          >
            <Add size={16} />
            Create member
          </button>
        </div>
      </div>

      {/* Members section */}
      <div className="madaar-surface rounded-2xl border border-base-content/10 bg-base-100">
        <div className="flex items-center justify-between border-b border-base-content/10 px-6 py-4">
          <div className="flex items-center gap-2">
            <User size={18} className="text-base-content/45" />
            <h2 className="text-lg font-semibold">Members</h2>
            <span className="rounded-full bg-base-200 px-2 py-0.5 text-xs font-medium text-base-content/55">
              {members.length}
            </span>
          </div>
        </div>

        {isMembersLoading ? (
          <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
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
          <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {members.map((member) => (
                <motion.div
                  layout
                  key={member.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="madaar-surface group relative flex items-center gap-4 rounded-xl border border-base-content/10 bg-base-100 p-4 transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5"
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
                    className="btn btn-ghost btn-square btn-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-error/60 hover:text-error hover:bg-error/10"
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

      {isCreateMemberOpen && (
        <CreateOrgMemberModal
          orgId={orgId!}
          isOpen={isCreateMemberOpen}
          onClose={() => setIsCreateMemberOpen(false)}
        />
      )}

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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
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
              className="w-full max-w-md rounded-2xl border border-base-content/10 bg-base-100 p-6 shadow-xl"
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
              <div className="mt-6 flex justify-end gap-3">
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
