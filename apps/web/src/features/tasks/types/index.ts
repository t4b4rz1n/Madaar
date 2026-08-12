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
  author: any;
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
  assignee_detail?: any;
  reporter_detail?: any;
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
}

export interface Board {
  id: string;
  title: string;
  background_color?: string;
  statuses: TaskStatus[];
}
