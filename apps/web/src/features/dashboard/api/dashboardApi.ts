import ApiService from "../../../core/api/apiService";

export const getOverviewKPIs = () => {
  return ApiService.get<any>("admin-panel/dashboard/overview/");
};

export const getQueuesBreakdown = () => {
  return ApiService.get<any>("admin-panel/dashboard/queues/");
};

export const getWorkersResources = (period: string) => {
  return ApiService.get<any>(`admin-panel/dashboard/workers/resources/`, { params: { period } });
};

export const getWorkersGrowth = (period: string) => {
  return ApiService.get<any>(`admin-panel/dashboard/workers/growth/`, { params: { period } });
};

export const getVulnerabilitiesGrowth = (period: string) => {
  return ApiService.get<any>(`admin-panel/dashboard/vulnerabilities/growth/`, { params: { period } });
};

export const getVulnerabilitySeverities = () => {
  return ApiService.get<any>("admin-panel/dashboard/vulnerabilities/severities/");
};

export const getAssetsGrowth = (period: string) => {
  return ApiService.get<any>(`admin-panel/dashboard/assets/growth/`, { params: { period } });
};

export const getScansThroughput = (period: string) => {
  return ApiService.get<any>(`admin-panel/dashboard/scans/throughput/`, { params: { period } });
};

export const getScansStatus = () => {
  return ApiService.get<any>("admin-panel/dashboard/scans/status/");
};

export const getTemplatesGrowth = (period: string) => {
  return ApiService.get<any>(`admin-panel/dashboard/templates/growth/`, { params: { period } });
};

export const getUserRegistrations = (period: string) => {
  return ApiService.get<any>(`admin-panel/dashboard/users/registrations/`, { params: { period } });
};

export const getLicenseDistribution = (period: string) => {
  return ApiService.get<any>(`admin-panel/dashboard/licenses/distribution/`, { params: { period } });
};

export const getTopActiveTeams = (period: string) => {
  return ApiService.get<any>(`admin-panel/dashboard/teams/active/`, { params: { period } });
};
