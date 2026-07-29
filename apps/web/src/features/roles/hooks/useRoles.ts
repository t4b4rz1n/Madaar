// @apps/web/src/features/roles/hooks/useRoles.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRoles, createRole, updateRole, deleteRole } from '../api/rolesApi';
import type { RoleFormData, RoleUpdateData } from '../types';

// کلید ثابت برای کش کردن داده‌ها
const ROLES_QUERY_KEY = ['roles'];

// هوک دریافت لیست نقش‌ها
export const useRoles = () => {
  return useQuery({
    queryKey: ROLES_QUERY_KEY,
    queryFn: getRoles,
  });
};

// هوک ایجاد نقش جدید
export const useCreateRole = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: RoleFormData) => createRole(data),
    onSuccess: () => {
      // بعد از موفقیت، لیست رو رفرش می‌کنیم
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
    },
  });
};

// هوک ویرایش نقش
export const useUpdateRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: RoleUpdateData }) => updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
    },
  });
};

// هوک حذف نقش
export const useDeleteRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
    },
  });
};
