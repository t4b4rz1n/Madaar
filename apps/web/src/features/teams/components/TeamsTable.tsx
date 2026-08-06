import { Edit2, People } from "iconsax-reactjs";
import type { TeamWithDetails } from "../types";

interface TeamsTableProps {
  teams: TeamWithDetails[];
  isLoading: boolean;
  isError: boolean;
  onEdit: (team: TeamWithDetails) => void;
  canManage: boolean;
}

export const TeamsTable = ({
  teams,
  isLoading,
  isError,
  onEdit,
  canManage,
}: TeamsTableProps) => {
  if (isLoading) {
    return (
      <div className="overflow-x-auto rounded-2xl border border-base-content/10 bg-base-100">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Team Name</th>
              <th>Leader</th>
              <th>Squads</th>
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
                  <div className="h-4 bg-base-content/10 rounded-sm w-12"></div>
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
    <div className="overflow-x-auto rounded-2xl border border-base-content/10 bg-base-100">
      <table className="table table-zebra w-full">
        <thead>
          <tr className="border-b border-base-content/10 text-base-content/70">
            <th>Team Name</th>
            <th>Leader</th>
            <th>Squads</th>
            <th>Status</th>
            <th>Created At</th>
            {canManage && <th className="text-end">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {teams.map((team) => (
            <tr
              key={team.id}
              className="hover:bg-base-200/50 transition-colors"
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
                {team.leader_details
                  ? `${team.leader_details.first_name} ${team.leader_details.last_name}`
                  : "—"}
              </td>
              <td>
                <span className="badge badge-ghost badge-sm font-mono">
                  {team.squads_count ?? 0}
                </span>
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
                  <button
                    onClick={() => onEdit(team)}
                    className="btn btn-ghost btn-xs text-primary hover:bg-primary/10 rounded-lg gap-1"
                  >
                    <Edit2 size={14} />
                    Edit
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
