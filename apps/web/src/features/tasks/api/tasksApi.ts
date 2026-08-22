import ApiService from '../../../core/api/apiService';
import type {
  Task,
  Board,
  TaskChecklistItem,
  TaskComment,
  TaskActivityLog,
  AsyncStandup,
  StandupGridData,
  User,
  PaginatedResponse,
} from '../types';

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
  return (data as any).data ?? data;
};

export const getProjectMembers = async (projectId: string): Promise<User[]> => {
  const res = await ApiService.get<PaginatedResponse<User> | User[]>(`/projects/${projectId}/members/`);
  return extractData<User>(res);
};

export const getTasks = async (projectId?: string, boardId?: string, pageSize = 100): Promise<Task[]> => {
  const params: Record<string, any> = { page_size: pageSize };
  if (projectId) params.project = projectId;
  if (boardId) {
    params.board = boardId;
  }
  const res = await ApiService.get<PaginatedResponse<Task> | Task[]>('/tasks/', { params });
  return extractData<Task>(res);
};
 
 export const getTask = async (taskId: string | number): Promise<Task> => {
   const res = await ApiService.get<Task>(`/tasks/${taskId}/`);
   return (res as any).data ?? res;
 };
 

export const reorderTasks = async (orders: { id: string | number; order: number }[]): Promise<any> => {
  return await ApiService.post('/tasks/reorder/', { orders });
};

export const createTask = async (projectId: string, title: string, statusId: string | number, priority: string = 'low'): Promise<Task> => {
  const data = await ApiService.post<Task>('/tasks/', {
    project: projectId,
    title,
    status: statusId,
    priority,
  });
  return (data as any).data ?? data;
};

export const moveTask = async (taskId: number | string, statusId: number | string, order: number): Promise<Task> => {
  const data = await ApiService.post<Task>(`/tasks/${taskId}/move/`, {
    status_id: statusId,
    order: order,
  });
  return (data as any).data ?? data;
};

export const markTaskBlocked = async (taskId: number | string, isBlocked: boolean): Promise<Task> => {
  const data = await ApiService.patch<Task>(`/tasks/${taskId}/`, {
    is_blocked: isBlocked,
  });
  return (data as any).data ?? data;
};

export const deleteTask = async (taskId: string | number): Promise<void> => {
  await ApiService.delete(`/tasks/${taskId}/`);
};

export const updateTask = async (taskId: string | number, data: Partial<Task>): Promise<Task> => {
  const res = await ApiService.patch<Task>(`/tasks/${taskId}/`, data);
  return (res as any).data ?? res;
};

// Checklists
export const getTaskChecklists = async (taskId: string | number): Promise<TaskChecklistItem[]> => {
  const res = await ApiService.get<PaginatedResponse<TaskChecklistItem> | TaskChecklistItem[]>('/tasks/checklist-items/', { params: { task: taskId } });
  return extractData<TaskChecklistItem>(res);
};

export const addChecklistItem = async (taskId: string | number, description: string): Promise<TaskChecklistItem> => {
  const data = await ApiService.post<TaskChecklistItem>('/tasks/checklist-items/', {
    task: taskId,
    description,
    is_completed: false,
  });
  return (data as any).data ?? data;
};

export const toggleChecklistItem = async (itemId: string | number): Promise<TaskChecklistItem> => {
  const data = await ApiService.post<TaskChecklistItem>(`/tasks/checklist-items/${itemId}/toggle/`);
  return (data as any).data ?? data;
};

export const deleteChecklistItem = async (itemId: string | number): Promise<void> => {
  await ApiService.delete(`/tasks/checklist-items/${itemId}/`);
};

// Comments
export const getTaskComments = async (taskId: string | number): Promise<TaskComment[]> => {
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

  return (data as any).data ?? data;
};

export const updateComment = async (commentId: string | number, content: string): Promise<TaskComment> => {
  const data = await ApiService.patch<TaskComment>(`/tasks/comments/${commentId}/`, {
    content,
  });
  return (data as any).data ?? data;
};

export const deleteComment = async (commentId: string | number): Promise<void> => {
  await ApiService.delete(`/tasks/comments/${commentId}/`);
};

// Standups (project-based daily reports)
export interface StandupPayload {
  projectId: string;
  /** ISO date (YYYY-MM-DD) */
  date: string;
  hoursWorked: number;
  todayWork: string;
  tomorrowPlan: string;
  blockers?: string;
}

export const getStandups = async (projectId?: string): Promise<AsyncStandup[]> => {
  const params: Record<string, any> = {};
  if (projectId) {
    params.project = projectId;
  }
  const res = await ApiService.get<PaginatedResponse<AsyncStandup> | AsyncStandup[]>(
    '/tasks/standups/',
    { params },
  );
  return extractData<AsyncStandup>(res);
};

export const createStandup = async (payload: StandupPayload): Promise<AsyncStandup> => {
  const data = await ApiService.post<AsyncStandup>('/tasks/standups/', {
    project: payload.projectId,
    date: payload.date,
    hours_worked: payload.hoursWorked,
    today_work: payload.todayWork,
    tomorrow_plan: payload.tomorrowPlan,
    blockers: payload.blockers?.trim() ? payload.blockers.trim() : null,
  });
  return (data as any).data ?? data;
};

export const updateStandup = async (
  entryId: string,
  payload: StandupPayload,
): Promise<AsyncStandup> => {
  const data = await ApiService.patch<AsyncStandup>(`/tasks/standups/${entryId}/`, {
    date: payload.date,
    hours_worked: payload.hoursWorked,
    today_work: payload.todayWork,
    tomorrow_plan: payload.tomorrowPlan,
    blockers: payload.blockers?.trim() ? payload.blockers.trim() : null,
  });
  return (data as any).data ?? data;
};

/** Quick-save from the grid cell: updates only the worked hours (Enter key). */
export const updateStandupHours = async (
  entryId: string,
  hoursWorked: number,
): Promise<AsyncStandup> => {
  const data = await ApiService.patch<AsyncStandup>(`/tasks/standups/${entryId}/`, {
    hours_worked: hoursWorked,
  });
  return (data as any).data ?? data;
};

/** Permanently delete a standup entry.
 *  Uses native fetch to bypass axios interceptors — the Django endpoint
 *  returns 204 No Content (empty body) which confuses the axios response chain.
 */
export const deleteStandup = async (entryId: string): Promise<void> => {
  const { useAuthStore } = await import('../../auth/store/authStore');
  const { getApiUrl } = await import('../../../core/api/config');

  const token = useAuthStore.getState().access;
  const url = `${getApiUrl()}/tasks/standups/${entryId}/`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  // Only treat genuine auth failures as errors. The backend uses soft-delete
  // and may return non-standard status codes — as long as it isn't a
  // permissions failure we consider the delete successful.
  if (response.status === 401 || response.status === 403) {
    throw new Error(`Not authorized (${response.status})`);
  }
};

/**
 * Monthly standup grid of a project (member rows × day columns).
 * Regular members receive themselves only; owners/admins the full list.
 */
export const getStandupGrid = async (
  projectId: string,
  year: number,
  month: number,
): Promise<StandupGridData> => {
  const data = await ApiService.get<StandupGridData>('/tasks/standups/grid/', {
    params: { project: projectId, year, month },
  });
  return (data as any).data ?? data;
};

export const createStatus = async (boardId: string | number, name: string, code?: string): Promise<any> => {
  const statusCode = code || name.toLowerCase().replace(/\s+/g, '-');
  const data = await ApiService.post<any>('/tasks/statuses/', {
    board: boardId,
    name,
    code: statusCode,
    order: 99,
  });
  return (data as any).data ?? data;
};
