import { AnimatePresence, motion } from "motion/react";
import { Add, ArrowLeft, People, User } from "iconsax-reactjs";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import {
  getOrganizationDetails,
  getOrganizationMembers,
} from "../api/organizationsApi";
import { CreateOrgMemberModal } from "../components/CreateOrgMemberModal";
import type { OrganizationMember } from "../types";

const getUserDisplayName = (member: OrganizationMember): string => {
  const { user } = member;
  const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
  if (fullName) return fullName;
  return user.username || user.email || "Member";
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
  const [isCreateMemberOpen, setIsCreateMemberOpen] = useState(false);

  const { data: organization, isLoading: isOrgLoading } = useQuery({
    queryKey: ["organizations", orgId],
    queryFn: () => getOrganizationDetails(orgId!),
    enabled: Boolean(orgId),
  });

  const { data: members = [], isLoading: isMembersLoading } = useQuery({
    queryKey: ["organizations", orgId, "members"],
    queryFn: () => getOrganizationMembers(orgId!),
    enabled: Boolean(orgId),
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
                  className="madaar-surface flex items-center gap-4 rounded-xl border border-base-content/10 bg-base-100 p-4 transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5"
                >
                  <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {getInitials(getUserDisplayName(member))}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {getUserDisplayName(member)}
                    </p>
                    <p className="truncate text-xs text-base-content/45">
                      {member.user.email}
                    </p>
                    {member.role && (
                      <span className="mt-1 inline-block rounded-full bg-base-200 px-2 py-0.5 text-[10px] font-medium text-base-content/55">
                        {member.role}
                      </span>
                    )}
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
    </div>
  );
}
