import ApiService from "../../../core/api/apiService";
import type { 
  Team, 
  TeamWithDetails, 
  TeamFormData, 
  Squad, 
  SquadFormData 
} from "../types";

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

  // دریافت لیست اسکوادها (معمولاً بر اساس team_id فیلتر می‌شود)
  getSquads: (params?: { team_id?: number }) =>
    ApiService.get<Squad[]>("/panel/squads/", { params }),

  // ایجاد اسکواد جدید
  createSquad: (data: SquadFormData) =>
    ApiService.post<Squad>("/panel/squads/", data),

  // ویرایش اسکواد
  updateSquad: (id: number, data: Partial<SquadFormData>) =>
    ApiService.patch<Squad>(`/panel/squads/${id}/`, data),

  // حذف اسکواد
  deleteSquad: (id: number) =>
    ApiService.delete(`/panel/squads/${id}/`),
};
