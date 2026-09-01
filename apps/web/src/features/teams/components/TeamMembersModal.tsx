import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import {
  Add,
  CloseCircle,
  People,
  Profile2User,
  ArrowDown2,
  UserMinus,
} from "iconsax-reactjs";
import {
  useTeamMembers,
  useAddTeamMember,
  useRemoveTeamMember,
} from "../hooks/useTeams";
import { useUsers } from "../../users/hooks/useUsers";
import { ConfirmationModal } from "../../../components/ConfirmationModal";
import type { Team, TeamMember } from "../types";
import type { User } from "../../users/types";

const backdropVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const modalVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 30, scale: 0.98 },
};

interface TeamMembersModalProps {
  team: Team | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TeamMembersModal = ({ team, isOpen, onClose }: TeamMembersModalProps) => {
  const { data: members, isLoading, isError } = useTeamMembers(team?.id);
  const addMember = useAddTeamMember();
  const removeMember = useRemoveTeamMember();
  const organizationId = team?.organization_id;
  const { data: usersResponse } = useUsers(
    new URLSearchParams(
      organizationId
        ? { page_size: "1000", organization_id: String(organizationId) }
        : { page_size: "1000" },
    ),
  );
  const users: User[] = usersResponse?.results ?? [];

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("member");
  const [removingMember, setRemovingMember] = useState<TeamMember | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedUserId("");
      setSelectedRole("member");
      setRemovingMember(null);
    }
  }, [isOpen]);

  const handleAddMember = async () => {
    if (!team || !selectedUserId) return;
    try {
      await addMember.mutateAsync({
        teamId: team.id,
        user: selectedUserId,
        role: selectedRole,
      });
      setSelectedUserId("");
      setSelectedRole("member");
    } catch {
      // toast handled by hook
    }
  };

  const handleRemoveConfirm = async () => {
    if (!removingMember || !team) return;
    try {
      await removeMember.mutateAsync({
        membershipId: removingMember.id,
        teamId: team.id,
      });
      setRemovingMember(null);
    } catch {
      // toast handled by hook
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "lead":
        return "badge-primary bg-primary/10 text-primary border-none";
      default:
        return "badge-ghost bg-base-200 text-base-content/60 border-none";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "lead":
        return "Lead";
      default:
        return "Member";
    }
  };

  const availableUsers = users.filter(
    (u) => !members?.some((m) => String(m.user) === String(u.id))
  );

  const memberCount = members?.length ?? 0;

  const modalContent = (
    <AnimatePresence>
      {isOpen && team && (
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 backdrop-blur-md sm:p-4"
          onClick={onClose}
        >
          <motion.div
            variants={modalVariants}
            className="madaar-surface relative m-0 flex max-h-[min(90vh,44rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[24px] border border-base-content/10 bg-base-100/95 shadow-madaar-floating backdrop-blur-xl sm:m-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex-shrink-0 border-b border-base-content/10 bg-base-200/20 p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                    <People size={28} />
                  </div>
                  <div>
                    <h3 className="font-bold text-2xl text-base-content">
                      Manage Members
                    </h3>
                    <p className="text-base-content/70 text-sm">
                      Members of <span className="font-semibold">{team.name}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-ghost btn-square btn-sm rounded-xl text-base-content/50 hover:text-base-content"
                >
                  <CloseCircle size={24} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="min-h-[200px] max-h-[500px] flex-1 overflow-y-auto p-5 sm:p-6">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-xl bg-base-200/50 animate-pulse"
                    >
                      <div className="w-10 h-10 rounded-full bg-base-content/10 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-base-content/10 rounded-sm w-32" />
                        <div className="h-3 bg-base-content/10 rounded-sm w-24" />
                      </div>
                      <div className="h-6 bg-base-content/10 rounded-xl w-16" />
                    </div>
                  ))}
                </div>
              ) : isError ? (
                <div className="flex flex-col items-center justify-center min-h-[200px] text-center border border-dashed border-error/30 rounded-2xl p-6 bg-error/5">
                  <p className="text-error font-medium">Failed to load members.</p>
                  <p className="text-xs text-base-content/60 mt-1">
                    Please check your network connection or try again later.
                  </p>
                </div>
              ) : members && members.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[200px] text-center border border-dashed border-base-content/20 rounded-2xl p-6">
                  <People className="text-base-content/40 mb-3" size={48} />
                  <p className="text-base-content font-medium text-lg">No members yet</p>
                  <p className="text-sm text-base-content/60 mt-1">
                    Add team members using the form below.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {members?.map((member) => (
                    <div
                      key={member.id}
                      className="group flex items-center gap-3 rounded-2xl border border-base-content/5 bg-base-200/25 p-3 transition-colors hover:bg-base-200/50"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden">
                        {member.user_details?.avatar ? (
                          <img
                            src={member.user_details.avatar}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <>
                            {member.user_details?.first_name?.[0]?.toUpperCase() || "?"}
                            {member.user_details?.last_name?.[0]?.toUpperCase() || ""}
                          </>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-base-content truncate">
                          {member.user_details
                            ? `${member.user_details.first_name} ${member.user_details.last_name}`
                            : "Unknown User"}
                        </p>
                        <p className="text-xs text-base-content/50 truncate">
                          {member.user_details?.email || ""}
                        </p>
                      </div>
                      <span
                        className={`badge badge-sm rounded-lg py-2 px-2 ${getRoleBadgeClass(member.role)}`}
                      >
                        {getRoleLabel(member.role)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setRemovingMember(member)}
                        className="btn btn-ghost btn-xs btn-square rounded-xl text-base-content/30 hover:text-error hover:bg-error/10 opacity-0 group-hover:opacity-100 transition-all motion-interactive"
                        title="Remove member"
                      >
                        <UserMinus size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Member Section */}
              {!isLoading && !isError && (
                <div className="mt-6 border-t border-base-content/10 pt-6">
                  <h4 className="font-semibold text-sm text-base-content mb-4 flex items-center gap-2">
                    <Add size={16} className="text-primary" />
                    Add New Member
                  </h4>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                      <select
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className="select select-bordered w-full rounded-xl pl-10"
                      >
                        <option value="">Select a user...</option>
                        {availableUsers.map((user) => (
                          <option key={user.id} value={String(user.id)}>
                            {user.first_name} {user.last_name} ({user.username})
                          </option>
                        ))}
                        {availableUsers.length === 0 && users.length > 0 && (
                          <option value="" disabled>
                            All users are already members
                          </option>
                        )}
                      </select>
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50 pointer-events-none">
                        <Profile2User size={18} />
                      </div>
                    </div>
                    <div className="relative w-full sm:w-36">
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="select select-bordered w-full rounded-xl appearance-none"
                      >
                        <option value="member">Member</option>
                        <option value="lead">Lead</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 pointer-events-none">
                        <ArrowDown2 size={16} />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddMember}
                      disabled={!selectedUserId || addMember.isPending}
                      className="btn btn-primary rounded-xl gap-1.5 shrink-0 motion-interactive"
                    >
                      {addMember.isPending ? (
                        <span className="loading loading-spinner loading-sm" />
                      ) : (
                        <>
                          <Add size={16} />
                          Add
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t border-base-content/10 bg-base-200/30 p-5 sm:p-6">
              <span className="text-xs text-base-content/50">
                {memberCount} member{memberCount !== 1 ? "s" : ""}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {typeof document !== "undefined" ? createPortal(modalContent, document.body) : null}
      <ConfirmationModal
        isOpen={removingMember !== null}
        onClose={() => setRemovingMember(null)}
        onConfirm={handleRemoveConfirm}
        title="Remove Member"
        message={`Are you sure you want to remove this member from the team?`}
        isLoading={removeMember.isPending}
      />
    </>
  );
};
