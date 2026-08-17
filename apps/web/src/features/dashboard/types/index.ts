export interface EmployeeTaskSummary {
  id: string;
  title: string;
  priority: "low" | "medium" | "high" | "critical" | string | null;
  due_date: string | null;
  status_name: string | null;
  status_code?: string | null;
  project_name: string | null;
  project_id: string | null;
}

export interface EmployeeTimeSummary {
  total_seconds: number;
  total_logs: number;
}

export interface EmployeeAttendanceStatus {
  id: string;
  check_in: string | null;
  check_out: string | null;
  is_remote: boolean;
  overtime_minutes: number;
  organization_name: string | null;
}

export interface EmployeeActiveTimer {
  id: string;
  start_time: string;
  task_id: string | null;
  task_title: string | null;
  project_name: string | null;
}

export interface EmployeeStandup {
  id: string;
  yesterday_work: string;
  today_work: string;
  blockers: string | null;
  created_at: string;
}

export interface EmployeeDashboard {
  upcoming_tasks: EmployeeTaskSummary[];
  overdue_tasks: EmployeeTaskSummary[];
  blocked_tasks: EmployeeTaskSummary[];
  today_standup: EmployeeStandup | null;
  weekly_time: EmployeeTimeSummary;
  active_projects: Array<{
    project_id: string;
    project_name: string;
    project_status: string;
    project_deadline: string | null;
    allocation_percentage: number;
  }>;
  attendance_today: EmployeeAttendanceStatus | null;
  active_timer: EmployeeActiveTimer | null;
  upcoming_milestones: Array<{
    id: string;
    title: string;
    status: string;
    target_date: string;
    project_name: string;
    project_id: string;
  }>;
}
