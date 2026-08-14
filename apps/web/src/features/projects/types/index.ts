// ۱. وضعیت‌های واقعی پروژه طبق مدل Django
export type ProjectStatus =
  | "draft"
  | "active"
  | "on_hold"
  | "completed"
  | "archived";

// ۲. تایپ اصلی پروژه (Project Entity)
export interface Project {
  id: string | number;
  organization: string | number;
  owner?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  } | null;
  name: string; // به جای title
  description: string;
  prefix?: string; // کلید اختصاری تسک‌ها (مثل PRJ)
  budget?: number;
  budget_currency?: string;
  status: ProjectStatus;
  start_date?: string;
  deadline?: string; // به جای end_date
  completed_at?: string;
  archived_at?: string;
  progress_percentage?: number;
  members_count?: number;
  created_at: string;
  updated_at: string;
}

// ۳. تایپ اعضای پروژه (Project Members) طبق مدل ProjectMember
export interface ProjectMember {
  id: string | number;
  project: string | number;
  user?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    avatar?: string;
  } | null;
  team?: {
    id: number;
    name: string;
  } | null;
  specialty?: string; // تخصص (مثل Frontend)
  allocation_percentage: number; // به جای capacity_percentage (بین ۱ تا ۱۰۰)
  allocation_start_date?: string;
  allocation_end_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ۴. تایپ نقاط عطف (Milestones) طبق مدل Milestone
export type MilestoneStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface Milestone {
  id: string | number;
  project: string | number;
  title: string;
  description?: string;
  status: MilestoneStatus;
  start_date?: string;
  target_date: string; // به جای due_date
  completed_at?: string;
  sequence: number; // ترتیب فازها
  weight: number; // وزن مایلستون در پیشرفت کل
  created_at: string;
  updated_at: string;
}

// ۵. تایپ فعالیت‌های پروژه (Project Activities) طبق مدل ProjectActivity
export interface ProjectActivity {
  id: string | number;
  project: string | number;
  actor?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    avatar?: string;
  } | null;
  event_type: string;
  entity_type: "project" | "member" | "milestone" | "task";
  entity_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// ۶. DTO ساخت پروژه جدید (Create Project Body)
export interface CreateProjectDTO {
  name: string;
  description: string;
  prefix?: string;
  budget?: number;
  budget_currency?: string;
  start_date?: string;
  deadline?: string;
}

// ۷. DTO ویرایش پروژه (Update Project Body)
export type UpdateProjectDTO = Partial<CreateProjectDTO> & {
  status?: ProjectStatus;
};
