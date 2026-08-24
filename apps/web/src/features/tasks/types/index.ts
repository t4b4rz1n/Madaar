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
  id: string;
  user: string;
  user_detail?: User;
  project: string;
  project_detail?: { id: string; name: string };
  /** ISO date (YYYY-MM-DD) this standup is reported for */
  date: string;
  hours_worked: string;
  today_work: string;
  blockers?: string | null;
  created_at: string;
}

export interface StandupGridMember {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  total_hours: string;
}

export interface StandupGridEntry {
  id: string;
  user_id: string;
  /** ISO date (YYYY-MM-DD) */
  date: string;
  hours_worked: string;
  is_complete: boolean;
  today_work: string;
  blockers?: string | null;
}

export interface StandupGridData {
  project: {
    id: string;
    name: string;
    prefix: string;
    organization_id: string;
  };
  year: number;
  month: number;
  days_in_month: number;
  /** Server-side today (ISO date) — days before this are locked */
  today: string;
  can_write: boolean;
  members: StandupGridMember[];
  entries: StandupGridEntry[];
}

export interface TaskStatus {
  id: string | number;
  code: string;
  name: string;
  order: number;
}

export interface TaskChecklistItem {
  id: string | number;
  description: string;
  is_completed: boolean;
  created_at: string;
}

export interface TaskComment {
  id: string | number;
  author: number;
  author_detail?: User;
  content: string;
  attached_file_url?: string;
  created_at: string;
}

export interface Task {
  id: string | number;
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
  checklist_stats?: {
    total: number;
    done: number;
    percent: number;
  };
  comments?: TaskComment[];
  comments_count?: number;
  is_active_timer_running?: boolean;
  estimated_hours?: number;
  spent_hours?: number;
  spent_seconds?: number;
  project?: number;
}

export interface Board {
  id: string;
  title: string;
  background_color?: string;
  statuses: TaskStatus[];
}
