// 1. Status Types
export type ProjectStatus = "draft" | "active" | "on_hold" | "completed" | "archived";

// 2. Auxiliary Nested Entities
export interface ProjectOrganization {
  id: string | number;
  name: string;
  slug?: string;
}

export interface ProjectOwner {
  id: string | number;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  avatar?: string | null;
}

// 3. Main Project Entity
export interface Project {
  id: string | number;
  organization: ProjectOrganization | string | number;
  owner?: ProjectOwner | null;
  name: string;
  description: string;
  prefix?: string;
  status: ProjectStatus;
  status_display?: string;
  budget?: number | string | null;
  budget_currency?: string;
  start_date?: string | null;
  deadline?: string | null;
  completed_at?: string | null;
  archived_at?: string | null;
  progress_percentage?: number;
  member_count?: number;
  members_count?: number;
  task_count?: number;
  milestone_count?: number;
  created_at?: string;
  updated_at?: string;
}

// 4. Project Members
export interface ProjectMember {
  id: string | number;
  project: string | number;
  user?: ProjectOwner | null;
  team?: {
    id: number;
    name: string;
  } | null;
  specialty?: string;
  allocation_percentage: number;
  allocation_start_date?: string;
  allocation_end_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 5. Milestones
export type MilestoneStatus = "pending" | "in_progress" | "completed" | "cancelled";

export interface Milestone {
  id: string | number;
  project: string | number;
  title: string;
  description?: string;
  status: MilestoneStatus;
  start_date?: string;
  target_date: string;
  completed_at?: string;
  sequence: number;
  weight: number;
  created_at: string;
  updated_at: string;
}

// 6. Activities
export interface ProjectActivity {
  id: string | number;
  project: string | number;
  actor?: ProjectOwner | null;
  event_type: string;
  entity_type: "project" | "member" | "milestone" | "task";
  entity_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// 7. Request DTOs
export interface CreateProjectDTO {
  name: string;
  description?: string;
  organization_id?: string | number;
  prefix?: string;
  budget?: number | string | null;
  budget_currency?: string;
  start_date?: string | null;
  deadline?: string | null;
  status?: ProjectStatus;
}

export type UpdateProjectDTO = Partial<CreateProjectDTO> & {
  status?: ProjectStatus;
};