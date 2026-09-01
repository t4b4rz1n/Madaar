import { motion } from "framer-motion";
import { Edit2, People, Profile2User, Trash, User } from "iconsax-reactjs";
import type { TeamWithDetails } from "../types";

interface TeamsGridProps {
  teams: TeamWithDetails[];
  isLoading: boolean;
  isError: boolean;
  onEdit: (team: TeamWithDetails) => void;
  onManageMembers?: (team: TeamWithDetails) => void;
  onDelete: (team: TeamWithDetails) => void;
  canManage: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
};

export const TeamsGrid = ({
  teams,
  isLoading,
  isError,
  onEdit,
  onManageMembers,
  onDelete,
  canManage,
}: TeamsGridProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="card bg-base-100 border border-base-content/10 p-6 space-y-4 animate-pulse rounded-2xl"
          >
            <div className="h-6 bg-base-content/10 rounded-sm w-2/3"></div>
            <div className="h-4 bg-base-content/10 rounded-sm w-full"></div>
            <div className="h-4 bg-base-content/10 rounded-sm w-1/2"></div>
            <div className="flex gap-2 pt-4">
              <div className="h-8 bg-base-content/10 rounded-xl w-20"></div>
              <div className="h-8 bg-base-content/10 rounded-xl w-20"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center border border-dashed border-error/30 rounded-2xl p-6 bg-error/5">
        <p className="text-error font-medium">Failed to load teams data.</p>
        <p className="text-xs text-base-content/60 mt-1">
          Please check your network connection or try again later.
        </p>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center border border-dashed border-base-content/20 rounded-2xl p-6">
        <People className="text-base-content/40 mb-3" size={48} />
        <p className="text-base-content font-medium text-lg">No teams found</p>
        <p className="text-sm text-base-content/60 mt-1">
          Try adjusting your search query or filters.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {teams.map((team) => (
        <motion.div
          key={team.id}
          variants={cardVariants}
          className="card bg-base-100 border border-base-content/10 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all duration-200 rounded-2xl group flex flex-col justify-between"
        >
          <div className="p-6">
            <div className="flex justify-between items-start gap-4">
              <h3 className="font-bold text-lg text-base-content group-hover:text-primary transition-colors duration-200 line-clamp-1">
                {team.name}
              </h3>
              <div
                className={`badge badge-sm rounded-lg py-2.5 px-2 ${
                  team.is_active
                    ? "badge-success bg-success/10 text-success border-none"
                    : "badge-ghost bg-base-200 text-base-content/60 border-none"
                }`}
              >
                {team.is_active ? "Active" : "Inactive"}
              </div>
            </div>

            <p className="text-sm text-base-content/75 mt-2 line-clamp-2 min-h-[40px]">
              {team.description || "No description provided."}
            </p>

            <div className="divider my-4 opacity-50"></div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-base-content/80">
                <div className="flex items-center gap-2 min-w-0">
                  {team.leader_details ? (
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                      {team.leader_details.first_name?.[0]?.toUpperCase() || "?"}
                      {team.leader_details.last_name?.[0]?.toUpperCase() || ""}
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-base-200 text-base-content/40 flex items-center justify-center shrink-0">
                      <Profile2User size={14} />
                    </div>
                  )}
                  <span className="font-medium text-base-content/60">Leader:</span>
                  <span className="truncate">
                    {team.leader_details
                      ? `${team.leader_details.first_name} ${team.leader_details.last_name}`
                      : "Not assigned"}
                  </span>
              </div>
            </div>

         </div>
         </div>

         <div className="px-6 pb-6 pt-3 flex items-end bg-base-200/20 rounded-b-2xl border-t border-base-content/5">
            <div className="text-xs text-base-content/50">
              {new Date(team.created_at ?? "").toLocaleDateString()}
            </div>
            {canManage && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onManageMembers?.(team)}
                  className="btn btn-ghost btn-xs gap-1.5 rounded-xl text-base-content/60 hover:text-primary hover:bg-primary/10 motion-interactive"
                  title="Manage Members"
                >
                  <User size={14} />
                  <span className="hidden sm:inline">Members</span>
                </button>
                <button
                  onClick={() => onEdit(team)}
                  className="btn btn-ghost btn-xs gap-1.5 rounded-xl text-base-content/60 hover:text-primary hover:bg-primary/10 motion-interactive"
                  title="Edit Team"
                >
                  <Edit2 size={14} />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                <button
                  onClick={() => onDelete(team)}
                  className="btn btn-ghost btn-xs gap-1.5 rounded-xl text-base-content/60 hover:text-error hover:bg-error/10 motion-interactive"
                  title="Delete Team"
                >
                  <Trash size={14} />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};
