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

export interface ManagerTaskStat {
  status_code: string | null;
  status_name: string | null;
  count: number;
}

export interface ManagerWorkHours {
  user_id: string;
  username: string;
  first_name: string;
  last_name: string;
  total_seconds: number;
  total_logs: number;
}

export interface ManagerAttendance {
  user_id: string;
  username: string;
  first_name: string;
  check_in: string | null;
  check_out: string | null;
  is_remote: boolean;
}

export interface ManagerProjectSummary {
  id: string;
  name: string;
  status: string;
  budget: string | number | null;
  budget_currency: string;
  deadline: string | null;
  active_member_count: number;
  total_tasks: number;
  done_tasks: number;
  total_time_seconds: number | null;
}

export interface ManagerDashboard {
  team_member_count: number;
  task_stats: ManagerTaskStat[];
  overdue_summary: {
    total_overdue: number;
    by_member: Array<{ username: string; first_name: string; count: number }>;
  };
  work_hours: ManagerWorkHours[];
  members_attendance: ManagerAttendance[];
  project_summary: ManagerProjectSummary[];
}

export interface ManagerMemberDetail {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  total_tasks: number;
  done_tasks: number;
  overdue_tasks: number;
  week_seconds: number | null;
}

export interface ExecutiveDashboard {
  company_overview: {
    total_members: number;
    projects: {
      total: number;
      active: number;
      completed: number;
      on_hold: number;
    };
    tasks: {
      total: number;
      done: number;
      in_progress: number;
    };
  };
  resource_utilization: {
    total_work_seconds: number;
    expected_seconds: number;
    utilization_rate: number;
    active_workers: number;
    total_members: number;
  };
  project_health: Array<{
    id: string;
    name: string;
    deadline: string | null;
    budget: string | number | null;
    budget_currency: string;
    total_tasks: number;
    done_tasks: number;
    overdue_tasks: number;
    overdue_milestones: number;
    progress: number;
    health: "on_track" | "at_risk" | "delayed" | string;
  }>;
  financial_summary: {
    total_budget: string | number | null;
    project_count: number;
    total_time_seconds: number | null;
  };
}
