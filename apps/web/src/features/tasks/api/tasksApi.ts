import ApiService from '../../../core/api/apiService';
import type { Task, Board } from '../types';

export const getBoards = async (projectId: string): Promise<Board[]> => {
  const res = await ApiService.get<any>('/tasks/boards/', { params: { project: projectId } });
  const data = res?.results || res?.data?.results || res?.data || res;
  return Array.isArray(data) ? data : [];
};

export const createBoard = async (projectId: string, title: string, backgroundColor: string): Promise<Board> => {
  const data = await ApiService.post<Board>('/tasks/boards/', {
    project: projectId,
    title,
    background_color: backgroundColor,
  });
  return data as Board;
};

export const getTasks = async (projectId: string, boardId?: string): Promise<Task[]> => {
  const params: any = { project: projectId, page_size: 100 };
  if (boardId) {
    params.board = boardId;
  }
  const res = await ApiService.get<any>('/tasks/', { params });
  const data = res?.results || res?.data?.results || res?.data || res;
  return Array.isArray(data) ? data : [];
};

export const createTask = async (projectId: string, title: string, statusId: number): Promise<Task> => {
  const data = await ApiService.post<Task>('/tasks/', {
    project: projectId,
    title,
    status: statusId,
  });
  return data as Task;
};

export const moveTask = async (taskId: number, statusId: number, order: number): Promise<Task> => {
  const data = await ApiService.post<Task>(`/tasks/${taskId}/move/`, {
    status_id: statusId,
    order: order,
  });
  return data as Task;
};

export const markTaskBlocked = async (taskId: number, isBlocked: boolean): Promise<Task> => {
  const data = await ApiService.patch<Task>(`/tasks/${taskId}/`, {
    is_blocked: isBlocked,
  });
  return data as Task;
};

export const deleteTask = async (taskId: number): Promise<void> => {
  await ApiService.delete(`/tasks/${taskId}/`);
};

export const updateTask = async (taskId: number, data: Partial<Task>): Promise<Task> => {
  const res = await ApiService.patch<Task>(`/tasks/${taskId}/`, data);
  return res as Task;
};

// Checklists
export const getTaskChecklists = async (taskId: number) => {
  const res = await ApiService.get<any>('/tasks/checklist-items/', { params: { task: taskId } });
  return res?.results || res?.data?.results || res?.data || res || [];
};

export const addChecklistItem = async (taskId: number, description: string) => {
  const data = await ApiService.post('/tasks/checklist-items/', {
    task: taskId,
    description,
    is_completed: false,
  });
  return data;
};

export const toggleChecklistItem = async (itemId: number, isCompleted: boolean) => {
  const data = await ApiService.patch(`/tasks/checklist-items/${itemId}/`, {
    is_completed: isCompleted,
  });
  return data;
};

// Comments
export const getTaskComments = async (taskId: number) => {
  const res = await ApiService.get<any>('/tasks/comments/', { params: { task: taskId } });
  return res?.results || res?.data?.results || res?.data || res || [];
};

export const addComment = async (taskId: number, content: string) => {
  const data = await ApiService.post('/tasks/comments/', {
    task: taskId,
    content,
  });
  return data;
};
