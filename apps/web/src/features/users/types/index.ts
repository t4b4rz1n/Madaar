export interface Role {
  id: number;
  name: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  role_id: number | null;
  profile_image: string | null;
  organization?: { id: string; name: string } | null;
}

export interface UserFormData {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  role_id: number | null;
  organization_id?: string;
}

export interface UserUpdateData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  role_id: number | null;
}
