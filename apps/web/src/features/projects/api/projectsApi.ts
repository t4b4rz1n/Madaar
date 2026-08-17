import ApiService from "../../../core/api/apiService";
import { getOrganizations } from "../../attendance/api/attendanceApi";
import type { Organization } from "../../attendance/types";
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
