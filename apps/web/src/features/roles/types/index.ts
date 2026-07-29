export interface Role {
  id: number;
  name: string;
  description?: string;
  permissions: string[]; // لیست مجوزها (مثلاً: ['user.create', 'user.delete'])
  is_active: boolean;
}

export interface RoleFormData {
  name: string;
  description: string;
  permissions: string[];
  is_active: boolean;
}

export interface RoleUpdateData {
  name?: string;
  description?: string;
  permissions?: string[];
  is_active?: boolean;
}
