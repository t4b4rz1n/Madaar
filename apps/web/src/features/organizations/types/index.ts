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

export interface OrganizationMember {
  id: number;
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    profile_image: string | null;
  };
  role?: string;
  joined_at?: string;
}
