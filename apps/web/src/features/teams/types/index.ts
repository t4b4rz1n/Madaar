

// تعریف UserBasicInfo برای نمایش اطلاعات لیدر
export interface UserBasicInfo {
  first_name: string;
  last_name: string;
}

export interface Team {
  id: number;
  name: string;
  description?: string;
  lead_id: number | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Squad {
  id: number;
  team_id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TeamFormData {
  name: string;
  description?: string;
  lead_id?: number | null;
  is_active: boolean;
}

export interface SquadFormData {
  team_id: number;
  name: string;
  description?: string;
  is_active: boolean;
}

export type TeamUpdateData = Partial<TeamFormData>;
export type SquadUpdateData = Partial<SquadFormData>;

export interface TeamWithDetails extends Team {
  leader_details?: UserBasicInfo | null;
  squads_count?: number;
}
