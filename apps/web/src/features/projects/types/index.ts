export type ProjectStatus = "draft" | "active" | "on_hold" | "completed" | "archived";

export interface ProjectOrganization {
  id: string;
  name: string;
  slug?: string;
}

export interface ProjectOwner {
  id: string | number;
  username?: string;
  email?: string;
  full_name?: string;
  avatar?: string | null;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  organization: ProjectOrganization;
  owner?: ProjectOwner | null;
  status: ProjectStatus;
  status_display?: string;
  budget?: string | number | null;
  budget_currency?: string;
  start_date?: string | null;
  deadline?: string | null;
  completed_at?: string | null;
  archived_at?: string | null;
  member_count?: number;
  task_count?: number;
  milestone_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectPayload {
  name: string;
  description?: string;
  organization_id: string;
  status: ProjectStatus;
  budget?: string | null;
  budget_currency?: string;
  start_date?: string | null;
  deadline?: string | null;
}
