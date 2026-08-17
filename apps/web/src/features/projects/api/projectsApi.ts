import ApiService from "../../../core/api/apiService";
<<<<<<< HEAD
import type {
  Project,
  CreateProjectDTO,
  UpdateProjectDTO,
  ProjectMember,
  Milestone,
  ProjectActivity,
} from "../types";

// ۱. پروژه‌ها
export const getProjects = (params?: URLSearchParams) => {
  const queryString = params?.toString() ? `?${params.toString()}` : "";
  return ApiService.getList<Project>(`api/v1/projects/${queryString}`);
};

export const getProjectById = (id: string | number) =>
  ApiService.get<Project>(`api/v1/projects/${id}/`);

export const createProject = (data: CreateProjectDTO) =>
  ApiService.post<Project>("api/v1/projects/", data);

export const updateProject = (id: string | number, data: UpdateProjectDTO) =>
  ApiService.patch<Project>(`api/v1/projects/${id}/`, data);

export const deleteProject = (id: string | number) =>
  ApiService.delete(`api/v1/projects/${id}/`);

export const archiveProject = (id: string | number) =>
  ApiService.post<Project>(`api/v1/projects/${id}/archive/`, {});

export const completeProject = (id: string | number) =>
  ApiService.post<Project>(`api/v1/projects/${id}/complete/`, {});

// ۲. اعضا و تخصیص منابع (Members)
export const getProjectMembers = (projectId: string | number) =>
  ApiService.getList<ProjectMember>(`api/v1/projects/${projectId}/members/`);

export const addProjectMember = (
  projectId: string | number,
  data: {
    user_id?: string | number;
    specialty?: string;
    allocation_percentage?: number;
  }
) =>
  ApiService.post<ProjectMember>(`api/v1/projects/${projectId}/members/`, data);

export const updateProjectMember = (
  projectId: string | number,
  memberId: string | number,
  data: { specialty?: string; allocation_percentage?: number }
) =>
  ApiService.patch<ProjectMember>(
    `api/v1/projects/${projectId}/members/${memberId}/`,
    data
  );

export const removeProjectMember = (
  projectId: string | number,
  memberId: string | number
) =>
  ApiService.delete(`api/v1/projects/${projectId}/members/${memberId}/`);

// ۳. نقاط عطف (Milestones)
export const getProjectMilestones = (projectId: string | number) =>
  ApiService.getList<Milestone>(`api/v1/projects/${projectId}/milestones/`);

export const createMilestone = (
  projectId: string | number,
  data: {
    title: string;
    description?: string;
    target_date: string;
    weight?: number;
  }
) =>
  ApiService.post<Milestone>(`api/v1/projects/${projectId}/milestones/`, data);

// ۴. فید فعالیت‌ها (Activities)
export const getProjectActivities = (projectId: string | number) =>
  ApiService.getList<ProjectActivity>(
    `api/v1/projects/${projectId}/activities/`
  );
=======
import { getOrganizations } from "../../organizations/api/organizationsApi";
import type { Organization } from "../../organizations/types";
import type { Project, ProjectPayload, ProjectStatus } from "../types";

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

export const getProjects = async (params?: {
  search?: string;
  status?: ProjectStatus;
}): Promise<Project[]> => {
  const response = await ApiService.get("/projects/", { params });
  return extractList<Project>(response);
};

export const getOrganizationsForProjects = (): Promise<Organization[]> =>
  getOrganizations();

export const createProject = async (payload: ProjectPayload): Promise<Project> => {
  const response = await ApiService.post<Project>("/projects/", payload);
  return unwrap<Project>(response);
};

export const updateProject = async (
  id: string,
  payload: Partial<ProjectPayload>,
): Promise<Project> => {
  const response = await ApiService.patch<Project>(`/projects/${id}/`, payload);
  return unwrap<Project>(response);
};

export const archiveProject = async (id: string): Promise<Project> => {
  const response = await ApiService.post<Project>(`/projects/${id}/archive/`);
  return unwrap<Project>(response);
};

export const completeProject = async (id: string): Promise<Project> => {
  const response = await ApiService.post<Project>(`/projects/${id}/complete/`);
  return unwrap<Project>(response);
};
>>>>>>> develop
