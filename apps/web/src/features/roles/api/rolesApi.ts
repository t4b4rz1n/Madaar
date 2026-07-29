// @apps/web/src/features/roles/api/rolesApi.ts

import ApiService from "../../../core/api/apiService";
import type { ApiResponseList } from "../../../core/api/apiService"; // ایمپورت تایپ لیست
import type { Role, RoleFormData, RoleUpdateData } from "../types";

// دریافت لیست تمام نقش‌ها با ساختار صفحه‌بندی شده
export const getRoles = async (): Promise<ApiResponseList<Role>> => {
  const response = await ApiService.getList<Role>('/roles');
  return response.data; // خروجی ما الان شامل results و بقیه فیلدهای صفحه‌بندی هست
};

// ایجاد نقش جدید
export const createRole = async (payload: RoleFormData): Promise<Role> => {
  const response = await ApiService.post<Role>('/roles', payload);
  return response.data;
};

// ویرایش نقش
export const updateRole = async (id: number, payload: RoleUpdateData): Promise<Role> => {
  const response = await ApiService.patch<Role>(`/roles/${id}`, payload);
  return response.data;
};

// حذف نقش
export const deleteRole = async (id: number): Promise<void> => {
  await ApiService.delete(`/roles/${id}`);
};
