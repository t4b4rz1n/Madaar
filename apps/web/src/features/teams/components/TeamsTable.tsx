import { Edit2, People, Profile2User, Trash, User } from "iconsax-reactjs";
import type { TeamWithDetails } from "../types";

interface TeamsTableProps {
  teams: TeamWithDetails[];
  isLoading: boolean;
  isError: boolean;
  onEdit: (team: TeamWithDetails) => void;
  onManageMembers?: (team: TeamWithDetails) => void;
  onDelete: (team: TeamWithDetails) => void;
  canManage: boolean;
}

export const TeamsTable = ({
  teams,
  isLoading,
  isError,
  onEdit,
  onManageMembers,
  onDelete,
  canManage,
}: TeamsTableProps) => {
  if (isLoading) {
    return (
      <div className="madaar-surface overflow-x-auto rounded-2xl border border-base-content/10 bg-base-100/80 shadow-madaar-card">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Team Name</th>
              <th>Leader</th>
              <th>Status</th>
              <th>Created At</th>
              {canManage && <th className="text-end">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i} className="animate-pulse">
                <td>
                  <div className="h-4 bg-base-content/10 rounded-sm w-32"></div>
                </td>
                <td>
                  <div className="h-4 bg-base-content/10 rounded-sm w-28"></div>
                </td>
                <td>
                  <div className="h-5 bg-base-content/10 rounded-xl w-16"></div>
                </td>
                <td>
                  <div className="h-4 bg-base-content/10 rounded-sm w-24"></div>
                </td>
                {canManage && (
                  <td className="text-end">
                    <div className="h-6 bg-base-content/10 rounded-lg w-12 ms-auto"></div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
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
    <div className="madaar-surface overflow-x-auto rounded-2xl border border-base-content/10 bg-base-100/90 shadow-madaar-card">
      <table className="table w-full">
          <thead>
            <tr className="border-b border-base-content/10 bg-base-200/35 text-xs uppercase tracking-wider text-base-content/55">
              <th>Team Name</th>
              <th>Leader</th>
              <th>Status</th>
              <th>Created At</th>
              {canManage && <th className="text-end">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {teams.map((team) => (
            <tr
              key={team.id}
              className="border-base-content/5 transition-colors hover:bg-base-200/45"
            >
              <td className="font-semibold text-base-content">
                <div>
                  <div className="font-bold">{team.name}</div>
                  {team.description && (
                    <div className="text-xs text-base-content/60 line-clamp-1 max-w-xs">
                      {team.description}
                    </div>
                  )}
                </div>
              </td>
              <td className="text-base-content/80">
                <div className="flex items-center gap-2">
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
                  <span>
                    {team.leader_details
                      ? `${team.leader_details.first_name} ${team.leader_details.last_name}`
                      : "\u2014"}
                  </span>
                </div>
              </td>
              <td>
                <span
                  className={`badge badge-sm rounded-lg ${
                    team.is_active
                      ? "badge-success bg-success/10 text-success border-none"
                      : "badge-ghost bg-base-200 text-base-content/60 border-none"
                  }`}
                >
                  {team.is_active ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="text-xs text-base-content/60">
                {new Date(team.created_at ?? "").toLocaleDateString()}
              </td>
              {canManage && (
                <td className="text-end">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onManageMembers?.(team)}
                      className="btn btn-ghost btn-xs gap-1 rounded-lg text-base-content/60 hover:bg-primary/10 hover:text-primary"
                      title="Manage Members"
                    >
                      <User size={14} />
                      <span className="hidden sm:inline">Members</span>
                    </button>
                    <button
                      onClick={() => onEdit(team)}
                      className="btn btn-ghost btn-xs gap-1 rounded-lg text-base-content/60 hover:text-primary hover:bg-primary/10"
                      title="Edit Team"
                    >
                      <Edit2 size={14} />
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                    <button
                      onClick={() => onDelete(team)}
                      className="btn btn-ghost btn-xs gap-1 rounded-lg text-base-content/60 hover:text-error hover:bg-error/10"
                      title="Delete Team"
                    >
                      <Trash size={14} />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
