import ApiService from "../../../core/api/apiService";
import type {
  Team,
  TeamMember,
  TeamWithDetails,
  TeamFormData,
} from "../types";
import type { AddTeamMemberPayload } from "../types";

export const teamsApi = {
  // دریافت لیست تیم‌ها با قابلیت فیلتر و صفحه‌بندی
  getTeams: (params?: Record<string, any>) =>
    ApiService.getList<TeamWithDetails>("/panel/teams/", { params }),

  // ایجاد تیم جدید
  createTeam: (data: TeamFormData) =>
    ApiService.post<Team>("/panel/teams/", data),

  // ویرایش تیم
  updateTeam: (id: number, data: Partial<TeamFormData>) =>
    ApiService.patch<Team>(`/panel/teams/${id}/`, data),

  // حذف تیم
  deleteTeam: (id: number) =>
    ApiService.delete(`/panel/teams/${id}/`),

  // دریافت اعضای تیم
  getTeamMembers: (teamId: number) =>
    ApiService.getList<TeamMember>("/panel/team-memberships/", {
      params: { team_id: teamId },
    }),

  // افزودن عضو جدید به تیم
  addTeamMember: (payload: AddTeamMemberPayload) =>
    ApiService.post<TeamMember>("/panel/team-memberships/", { team: payload.teamId, user: payload.user, role: payload.role }),

  // حذف عضو از تیم
  removeTeamMember: (membershipId: number) =>
    ApiService.delete(`/panel/team-memberships/${membershipId}/`),

  // بروزرسانی نقش عضو تیم
  updateTeamMemberRole: (membershipId: number, role: string) =>
    ApiService.patch<TeamMember>(`/panel/team-memberships/${membershipId}/`, { role }),
};
