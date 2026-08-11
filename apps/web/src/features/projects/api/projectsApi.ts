import ApiService from "../../../core/api/apiService";
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
  data: { user_id: string | number; role: string; capacity_percentage: number }
) =>
  ApiService.post<ProjectMember>(`api/v1/projects/${projectId}/members/`, data);

export const updateProjectMember = (
  projectId: string | number,
  memberId: string | number,
  data: { role?: string; capacity_percentage?: number }
) =>
  ApiService.patch<ProjectMember>(`api/v1/projects/${projectId}/members/${memberId}/`, data);

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
  data: { title: string; description?: string; due_date: string }
) =>
  ApiService.post<Milestone>(`api/v1/projects/${projectId}/milestones/`, data);

// ۴. فید فعالیت‌ها (Activities)
export const getProjectActivities = (projectId: string | number) =>
  ApiService.getList<ProjectActivity>(`api/v1/projects/${projectId}/activities/`);