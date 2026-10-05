import ApiService from "../../../core/api/apiService";
import type { EmployeeDashboard, ExecutiveDashboard, ManagerDashboard, ManagerMemberDetail } from "../types";

export const getEmployeeDashboard = async (timezone: string) => {
  const response = await ApiService.get<EmployeeDashboard>("reports/employee/dashboard/", {
    params: { tz: timezone },
  });
  return response.data;
};

export const getManagerDashboard = async (teamId: string | null, timezone: string) => {
  const response = await ApiService.get<ManagerDashboard>("reports/manager/dashboard/", {
    params: { ...(teamId ? { team_id: teamId } : {}), tz: timezone },
  });
  return response.data;
};

export const getManagerMembers = async (teamId: string | null, timezone: string) => {
  const response = await ApiService.get<ManagerMemberDetail[]>("reports/manager/members/", {
    params: { ...(teamId ? { team_id: teamId } : {}), tz: timezone },
  });
  return response.data;
};

export const getExecutiveDashboard = async (organizationId: string, timezone: string) => {
  const response = await ApiService.get<ExecutiveDashboard>("reports/executive/dashboard/", {
    params: { org_id: organizationId, tz: timezone },
  });
  return response.data;
};
