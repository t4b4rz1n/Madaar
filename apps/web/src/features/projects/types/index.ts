// وضعیت‌های استاندارد پروژه
export type ProjectStatus = 'planning' | 'in_progress' | 'completed' | 'archived';

// تایپ مربوط به اعضای پروژه (Project Members)
export interface ProjectMember {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  role: string;
  capacity_percentage: number; // درصد درگیری فرد در پروژه
}

// تایپ نقاط عطف (Milestones)
export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  due_date: string;
  is_completed: boolean;
}

// تایپ فعالیت‌های پروژه (Activities)
export interface ProjectActivity {
  id: string;
  project_id: string;
  user_name: string;
  user_avatar?: string;
  action: string;
  timestamp: string;
}

// تایپ اصلی پروژه (Project Entity)
export interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  budget?: number;
  start_date: string;
  end_date: string;
  members_count?: number;
  progress_percentage?: number;
  created_at: string;
  updated_at: string;
}

// DTO ساخت پروژه جدید (Create Project Body)
export interface CreateProjectDTO {
  title: string;
  description: string;
  budget?: number;
  start_date: string;
  end_date: string;
}

// DTO ویرایش پروژه (Update Project Body)
export type UpdateProjectDTO = Partial<CreateProjectDTO> & {
  status?: ProjectStatus;
};
