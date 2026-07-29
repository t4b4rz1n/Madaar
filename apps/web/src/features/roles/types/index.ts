export interface Role {
  id: number;
  name: string;
  description?: string;
  permissions: string[]; // لیست مجوزها (مثلاً: ['user.create', 'user.delete'])
  is_active: boolean;
}

export type RoleFormData = {
  name: string;
  description?: string;
  is_active: boolean;
  is_staff: boolean;
};


export interface RoleUpdateData {
  name?: string;
  description?: string;
  permissions?: string[];
  is_active?: boolean;
}
