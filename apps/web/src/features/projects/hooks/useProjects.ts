import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  archiveProject,
  completeProject,
  getProjectMembers,
  addProjectMember,
//   removeProjectMember,
  getProjectMilestones,
  createMilestone,
  getProjectActivities,
} from "../api/projectsApi";
import type { CreateProjectDTO, UpdateProjectDTO } from "../types";

// کلیدهای Query Keys برای Caching منظم
export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: (params?: string) => [...projectKeys.lists(), { params }] as const,
  details: () => [...projectKeys.all, "detail"] as const,
  detail: (id: string | number) => [...projectKeys.details(), id] as const,
  members: (id: string | number) => [...projectKeys.detail(id), "members"] as const,
  milestones: (id: string | number) => [...projectKeys.detail(id), "milestones"] as const,
  activities: (id: string | number) => [...projectKeys.detail(id), "activities"] as const,
};

// ۱. دریافت لیست پروژه‌ها
export const useProjects = (params?: URLSearchParams) => {
  return useQuery({
    queryKey: projectKeys.list(params?.toString()),
    queryFn: () => getProjects(params),
  });
};

// ۲. دریافت جزئیات یک پروژه
export const useProject = (id: string | number) => {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => getProjectById(id),
    enabled: !!id,
  });
};

// ۳. ساخت پروژه جدید
export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectDTO) => createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
};

// ۴. ویرایش پروژه
export const useUpdateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: UpdateProjectDTO }) =>
      updateProject(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.id) });
    },
  });
};

// ۵. حذف پروژه
export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) => deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
};

// ۶. آرشیو و تکمیل پروژه
export const useArchiveProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) => archiveProject(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
    },
  });
};

export const useCompleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) => completeProject(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
    },
  });
};

// ----------- اعضا (Members) -----------

export const useProjectMembers = (projectId: string | number) => {
  return useQuery({
    queryKey: projectKeys.members(projectId),
    queryFn: () => getProjectMembers(projectId),
    enabled: !!projectId,
  });
};

export const useAddProjectMember = (projectId: string | number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { user_id: string | number; role: string; capacity_percentage: number }) =>
      addProjectMember(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.members(projectId) });
    },
  });
};

// ----------- نقاط عطف (Milestones) -----------

export const useProjectMilestones = (projectId: string | number) => {
  return useQuery({
    queryKey: projectKeys.milestones(projectId),
    queryFn: () => getProjectMilestones(projectId),
    enabled: !!projectId,
  });
};

export const useCreateMilestone = (projectId: string | number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { title: string; description?: string; due_date: string }) =>
      createMilestone(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.milestones(projectId) });
    },
  });
};

// ----------- فید فعالیت‌ها (Activities) -----------

export const useProjectActivities = (projectId: string | number) => {
  return useQuery({
    queryKey: projectKeys.activities(projectId),
    queryFn: () => getProjectActivities(projectId),
    enabled: !!projectId,
  });
};