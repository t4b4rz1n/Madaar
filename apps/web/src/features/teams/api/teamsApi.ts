import ApiService from "../../../core/api/apiService";
import type {
  Team,
  TeamMember,
  TeamWithDetails,
  TeamFormData,
} from "../types";
import type { AddTeamMemberPayload } from "../types";

export const teamsApi = {
  getTeams: (params?: Record<string, any>) =>
    ApiService.getList<TeamWithDetails>("/panel/teams/", { params }),

  createTeam: (data: TeamFormData) =>
    ApiService.post<Team>("/panel/teams/", data),

  updateTeam: (id: number, data: Partial<TeamFormData>) =>
    ApiService.patch<Team>(`/panel/teams/${id}/`, data),

  deleteTeam: (id: number) =>
    ApiService.delete(`/panel/teams/${id}/`),

  getTeamMembers: (teamId: number) =>
    ApiService.getList<TeamMember>("/panel/team-memberships/", {
      params: { team_id: teamId },
    }),

  addTeamMember: (payload: AddTeamMemberPayload) =>
    ApiService.post<TeamMember>("/panel/team-memberships/", { team: payload.teamId, user: payload.user, role: payload.role }),

  removeTeamMember: (membershipId: number) =>
    ApiService.delete(`/panel/team-memberships/${membershipId}/`),

  updateTeamMemberRole: (membershipId: number, role: string) =>
    ApiService.patch<TeamMember>(`/panel/team-memberships/${membershipId}/`, { role }),
};
