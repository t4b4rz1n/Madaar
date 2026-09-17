// Analytics Types for CFD, Burndown, and Cycle/Lead Time

// ── Cumulative Flow Diagram ──────────────────────────────────────────────────

export interface CfdStatus {
  code: string;
  name: string;
  order: number;
}

export interface CfdDay {
  date: string; // ISO date YYYY-MM-DD
  counts: Record<string, number>; // status_code → task count
}

export interface CfdData {
  statuses: CfdStatus[];
  data: CfdDay[];
}

export interface CfdParams {
  board_id?: string;
  start_date?: string;
  end_date?: string;
  tz?: string;
}

// ── Milestone Burndown / Burnup ──────────────────────────────────────────────

export interface MilestoneMeta {
  id: string;
  title: string;
  status: string;
  start_date: string | null;
  target_date: string;
  project_id: string;
  project_name: string | null;
  completed_at?: string | null;
  completed_date?: string | null;
}

export interface BurndownPoint {
  date: string;
  remaining: number;
}

export interface BurnupPoint {
  date: string;
  done: number;
  total: number;
}

export interface MilestoneBurndownData {
  milestone: MilestoneMeta;
  total_tasks: number;
  start_date: string | null;
  target_date: string | null;
  ideal_line: BurndownPoint[];
  actual_burndown: BurndownPoint[];
  burnup: BurnupPoint[];
  note?: string | null;
}

// ── Cycle Time & Lead Time ────────────────────────────────────────────────────

export interface CycleTimeByStatus {
  status_code: string;
  avg_hours_in_status: number | null;
}

export interface CycleTimeTask {
  task_id: string;
  title: string;
  lead_time_hours: number;
  cycle_time_hours: number;
  done_at: string;
}

export interface CycleLeadTimePeriod {
  start: string;
  end: string;
}

export interface CycleLeadTimeData {
  period: CycleLeadTimePeriod | null;
  task_count: number;
  avg_lead_time_hours: number | null;
  avg_cycle_time_hours: number | null;
  p50_lead_time_hours: number | null;
  p95_lead_time_hours: number | null;
  p50_cycle_time_hours: number | null;
  p95_cycle_time_hours: number | null;
  by_status: CycleTimeByStatus[];
  tasks: CycleTimeTask[];
}

export interface CycleLeadTimeParams {
  board_id?: string;
  start_date?: string;
  end_date?: string;
  assignee_id?: string;
  tz?: string;
}
