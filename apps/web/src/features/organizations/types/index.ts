export type OrganizationStatus = "active" | "suspended" | "archived";

export interface OrganizationOwner {
  id: string | number;
  username?: string;
  email?: string;
  full_name?: string;
  avatar?: string | null;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: OrganizationStatus;
  status_display?: string;
  owner?: OrganizationOwner | null;
  member_count?: number;
  team_count?: number;
  project_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface OrganizationPayload {
  name: string;
  slug?: string;
  description?: string;
  status: OrganizationStatus;
}

/** Flat member result from /api/v1/organizations/{orgId}/members/ */
export interface OrganizationMember {
  id: number;
  user_id: string;
  full_name: string;
  email: string;
  username: string;
  avatar: string | null;
  role?: string;
  role_name?: string;
  role_display?: string;
  created_at?: string;
}

export interface AddExistingMemberPayload {
  user_id: string;
  role_id?: string | null;
}
