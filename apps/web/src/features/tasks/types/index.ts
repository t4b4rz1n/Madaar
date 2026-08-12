export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar?: string;
  avatar_url?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface TaskActivityLog {
  id: number;
  task: number;
  board?: number;
  board_detail?: any;
  actor: number;
  actor_detail?: User;
  action: string;
  created_at: string;
}

export interface AsyncStandup {
  id: number;
  user: number;
  user_detail?: User;
  organization?: number;
  yesterday_work: string;
  today_work: string;
  blockers?: string;
  created_at: string;
}

export interface TaskStatus {
  id: number;
  code: string;
  name: string;
  order: number;
}

export interface TaskChecklistItem {
  id: number;
  description: string;
  is_completed: boolean;
  created_at: string;
}

export interface TaskComment {
  id: number;
  author: number;
  author_detail?: User;
  content: string;
  attached_file_url?: string;
  created_at: string;
}

export interface Task {
  id: number;
  key: string;
  title: string;
  description?: string;
  status_detail?: TaskStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee?: number;
  assignee_detail?: User;
  reporter?: number;
  reporter_detail?: User;
  due_date?: string;
  is_finished: boolean;
  is_blocked: boolean;
  progress_percent: number;
  subtasks_count: number;
  subtasks?: Task[];
  parent_task?: number;
  order: number;
  checklist_items?: TaskChecklistItem[];
  comments?: TaskComment[];
  comments_count?: number;
}

export interface Board {
  id: string;
  title: string;
  background_color?: string;
  statuses: TaskStatus[];
}
