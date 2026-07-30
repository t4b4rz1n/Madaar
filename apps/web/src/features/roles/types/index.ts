export interface Role {
  id: number;
  name: string;
  description?: string;
  permissions: string[];
  is_active: boolean;
  is_staff: boolean;
}

export type RoleFormData = {
  name: string;
  description?: string;
  is_active: boolean;
  is_staff?: boolean;
  permissions: string[];
};

export interface RoleUpdateData {
  name?: string;
  description?: string;
  permissions?: string[];
  is_active?: boolean;
  is_staff?: boolean;
}
