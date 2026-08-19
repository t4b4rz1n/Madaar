import ApiService from "../../../core/api/apiService";
import { getOrganizations } from "../../organizations/api/organizationsApi";
import type { Organization } from "../../organizations/types";
import type {
  Project,
  ProjectListParams,
  ProjectPayload,
  ProjectMember,
  Milestone,
  ProjectActivity,
} from "../types";

// ==========================================
// 🛠️ API RESPONSE UNWRAPPING HELPERS
// ==========================================
const unwrap = <T>(response: unknown): T => {
  const value = response as { data?: unknown } | null;
  return (value?.data ?? response) as T;
};

const extractList = <T>(response: unknown): T[] => {
  const root = unwrap<unknown>(response);
  if (Array.isArray(root)) return root as T[];
  if (root && typeof root === "object") {
    const results = (root as { results?: unknown }).results;
    return Array.isArray(results) ? (results as T[]) : [];
  }
  return [];
};

// ==========================================
// 🚀 PROJECTS CORE API
// ==========================================
export const getProjects = async (
  params?: ProjectListParams
): Promise<Project[]> => {
  const normalizedParams =
    params instanceof URLSearchParams
      ? Object.fromEntries(params.entries())
      : params;
  const response = await ApiService.get("projects/", {
    params: normalizedParams,
  });
  return extractList<Project>(response);
};

export const getProjectById = async (id: string | number): Promise<Project> => {
  const response = await ApiService.get(`projects/${id}/`);
  return unwrap<Project>(response);
};

export const getOrganizationsForProjects = (): Promise<Organization[]> =>
  getOrganizations();

export const createProject = async (payload: ProjectPayload): Promise<Project> => {
  const response = await ApiService.post<Project>("projects/", payload);
  return unwrap<Project>(response);
};

export const updateProject = async (
  id: string | number,
  payload: Partial<ProjectPayload>
): Promise<Project> => {
  const response = await ApiService.patch<Project>(`projects/${id}/`, payload);
  return unwrap<Project>(response);
};

export const deleteProject = async (id: string | number): Promise<void> => {
  await ApiService.delete(`projects/${id}/`);
};

export const archiveProject = async (id: string | number): Promise<Project> => {
  const response = await ApiService.post<Project>(`projects/${id}/archive/`, {});
  return unwrap<Project>(response);
};

export const completeProject = async (id: string | number): Promise<Project> => {
  const response = await ApiService.post<Project>(`projects/${id}/complete/`, {});
  return unwrap<Project>(response);
};

// ==========================================
// 👥 PROJECT MEMBERS API
// ==========================================
export const getProjectMembers = async (
  projectId: string | number
): Promise<ProjectMember[]> => {
  const response = await ApiService.get(`projects/${projectId}/members/`);
  return extractList<ProjectMember>(response);
};

export const addProjectMember = async (
  projectId: string | number,
  data: {
    user_id?: string | number;
    team_id?: string | number;
    specialty?: string;
    allocation_percentage?: number;
  }
): Promise<ProjectMember> => {
  const response = await ApiService.post<ProjectMember>(
    `projects/${projectId}/members/`,
    data
  );
  return unwrap<ProjectMember>(response);
};

export const updateProjectMember = async (
  projectId: string | number,
  memberId: string | number,
  data: { specialty?: string; allocation_percentage?: number }
): Promise<ProjectMember> => {
  const response = await ApiService.patch<ProjectMember>(
    `projects/${projectId}/members/${memberId}/`,
    data
  );
  return unwrap<ProjectMember>(response);
};

export const removeProjectMember = async (
  projectId: string | number,
  memberId: string | number
): Promise<void> => {
  await ApiService.delete(`projects/${projectId}/members/${memberId}/`);
};

// ==========================================
// 🚩 PROJECT MILESTONES API
// ==========================================
export const getProjectMilestones = async (
  projectId: string | number
): Promise<Milestone[]> => {
  const response = await ApiService.get(`projects/${projectId}/milestones/`);
  return extractList<Milestone>(response);
};

export const createMilestone = async (
  projectId: string | number,
  data: {
    title: string;
    description?: string;
    target_date: string;
    weight?: number;
  }
): Promise<Milestone> => {
  const response = await ApiService.post<Milestone>(
    `projects/${projectId}/milestones/`,
    data
  );
  return unwrap<Milestone>(response);
};

// ==========================================
// 📈 PROJECT ACTIVITIES API
// ==========================================
export const getProjectActivities = async (
  projectId: string | number
): Promise<ProjectActivity[]> => {
  const response = await ApiService.get(`projects/${projectId}/activities/`);
  return extractList<ProjectActivity>(response);
};