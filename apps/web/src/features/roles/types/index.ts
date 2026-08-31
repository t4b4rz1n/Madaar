// apps/web/src/features/roles/types/index.ts

export interface Permission {
  id: string;
  code: string;
  name: string;
  description?: string;
  module: string;
}

export interface PermissionGroup {
  module: string;
  permissions: Permission[];
}

export interface PermissionsResponse {
  permissions: Permission[];
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  is_protected?: boolean;
  permissions: string[]; // list of permission codes
  member_count?: number;
}

export type RoleFormData = {
  name: string;
  description?: string;
  permissions: string[];
  organization_id?: string;
};

export interface RoleUpdateData {
  name?: string;
  description?: string;
  permissions?: string[];
}
