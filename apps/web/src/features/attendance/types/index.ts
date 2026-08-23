import type { User } from '../../tasks/types';

export interface Organization {
  id: string;
  name: string;
}

export interface Attendance {
  id: number;
  user: string | number;
  user_detail?: User;
  organization?: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  overtime_minutes: number;
  is_active?: boolean;
  total_seconds?: number;
  base_total_seconds?: number;
  active_session_start?: string | null;
  created_at: string;
}

export interface TimeLog {
  id: string | number;
  user: number;
  user_detail?: User;
  task: string | number;
  project?: string;
  date: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number;
  is_active: boolean;
  description: string;
  created_at: string;
}

export interface TimeOffRequest {
  id: string | number;
  user: string | number;
  user_detail?: User;
  organization: string;
  request_type: 'vacation' | 'sick' | 'hourly' | 'remote' | 'overtime';
  start_datetime: string;
  end_datetime: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string | number;
  manager_note?: string;
  created_at: string;
}

export interface Holiday {
  id: number;
  name: string;
  date: string;
  organization?: string;
  description: string;
  is_official: boolean;
}

export interface TimesheetEntry {
  date: string;
  total_seconds: number;
  user__username?: string;
}
