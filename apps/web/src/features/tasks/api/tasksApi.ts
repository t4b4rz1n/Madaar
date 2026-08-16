import ApiService from '../../../core/api/apiService';
import type { Task, Board, TaskChecklistItem, TaskComment, TaskActivityLog, AsyncStandup, User, PaginatedResponse } from '../types';

// Helper to extract data from various response shapes (DRF vs Custom ApiResponse)
const extractData = <T>(res: any): T[] => {
  const data = res?.results ?? res?.data?.results ?? res?.data ?? res;
  return Array.isArray(data) ? data : [];
};

export const getBoards = async (projectId: string): Promise<Board[]> => {
  const res = await ApiService.get<PaginatedResponse<Board> | Board[]>('/tasks/boards/', { params: { project: projectId } });
  return extractData<Board>(res);
};

export const createBoard = async (projectId: string, title: string, backgroundColor: string): Promise<Board> => {
  const data = await ApiService.post<Board>('/tasks/boards/', {
    project: projectId,
    title,
    background_color: backgroundColor,
  });
  return data as Board;
};

export const getProjectMembers = async (projectId: string): Promise<User[]> => {
  const res = await ApiService.get<PaginatedResponse<User> | User[]>(`/projects/${projectId}/members/`);
  return extractData<User>(res);
};

export const getTasks = async (projectId: string, boardId?: string): Promise<Task[]> => {
  const params: Record<string, any> = { project: projectId, page_size: 100 };
  if (boardId) {
    params.board = boardId;
  }
  const res = await ApiService.get<PaginatedResponse<Task> | Task[]>('/tasks/', { params });
  return extractData<Task>(res);
};

export const reorderTasks = async (orders: { id: number; order: number }[]): Promise<any> => {
  return await ApiService.post('/tasks/reorder/', { orders });
};

export const createTask = async (projectId: string, title: string, statusId: number, priority: string = 'low'): Promise<Task> => {
  const data = await ApiService.post<Task>('/tasks/', {
    project: projectId,
    title,
    status: statusId,
    priority,
  });
  return data as Task;
};

export const moveTask = async (taskId: number | string, statusId: number | string, order: number): Promise<Task> => {
  const data = await ApiService.post<Task>(`/tasks/${taskId}/move/`, {
    status_id: statusId,
    order: order,
  });
  return data as Task;
};

export const markTaskBlocked = async (taskId: number | string, isBlocked: boolean): Promise<Task> => {
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
export const getTaskChecklists = async (taskId: number): Promise<TaskChecklistItem[]> => {
  const res = await ApiService.get<PaginatedResponse<TaskChecklistItem> | TaskChecklistItem[]>('/tasks/checklist-items/', { params: { task: taskId } });
  return extractData<TaskChecklistItem>(res);
};

export const addChecklistItem = async (taskId: string | number, description: string): Promise<TaskChecklistItem> => {
  const data = await ApiService.post<TaskChecklistItem>('/tasks/checklist-items/', {
    task: taskId,
    description,
    is_completed: false,
  });
  return data as TaskChecklistItem;
};

export const toggleChecklistItem = async (itemId: number, isCompleted: boolean): Promise<TaskChecklistItem> => {
  const data = await ApiService.patch<TaskChecklistItem>(`/tasks/checklist-items/${itemId}/`, {
    is_completed: isCompleted,
  });
  return data as TaskChecklistItem;
};

// Comments
export const getTaskComments = async (taskId: number): Promise<TaskComment[]> => {
  const res = await ApiService.get<PaginatedResponse<TaskComment> | TaskComment[]>('/tasks/comments/', { params: { task: taskId } });
  return extractData<TaskComment>(res);
};

export const getTaskActivities = async (taskId: string | number): Promise<TaskActivityLog[]> => {
  const res = await ApiService.get<PaginatedResponse<TaskActivityLog> | TaskActivityLog[]>(`/tasks/${taskId}/activities/`);
  return extractData<TaskActivityLog>(res);
};

export const addComment = async (taskId: string | number, content: string, file?: File): Promise<TaskComment> => {
  let data;
  
  if (file) {
    const formData = new FormData();
    formData.append('task', taskId.toString());
    formData.append('content', content);
    formData.append('attached_file', file);
    
    // Axios handles FormData correctly and sets multipart/form-data
    data = await ApiService.post<TaskComment>('/tasks/comments/', formData);
  } else {
    data = await ApiService.post<TaskComment>('/tasks/comments/', {
      task: taskId,
      content,
    });
  }
  
  return data as TaskComment;
};

export const updateComment = async (commentId: string | number, content: string): Promise<TaskComment> => {
  const data = await ApiService.patch<TaskComment>(`/tasks/comments/${commentId}/`, {
    content,
  });
  return data as TaskComment;
};

export const deleteComment = async (commentId: string | number): Promise<void> => {
  await ApiService.delete(`/tasks/comments/${commentId}/`);
};

// Standups
export const getStandups = async (organizationId?: string): Promise<AsyncStandup[]> => {
  const params: Record<string, any> = {};
  if (organizationId) {
    params.organization = organizationId;
  }
  const res = await ApiService.get<PaginatedResponse<AsyncStandup> | AsyncStandup[]>('/tasks/standups/', { params });
  return extractData<AsyncStandup>(res);
};

export const createStandup = async (
  yesterdayWork: string,
  todayWork: string,
  blockers?: string,
  organizationId?: string
): Promise<AsyncStandup> => {
  const data = await ApiService.post<AsyncStandup>('/tasks/standups/', {
    yesterday_work: yesterdayWork,
    today_work: todayWork,
    blockers,
    organization: organizationId,
  });
  return data as AsyncStandup;
};
