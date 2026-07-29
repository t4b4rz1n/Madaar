// apps/web/src/features/roles/api/rolesApi.ts

import ApiService from "../../../core/api/apiService";
import type { ApiResponseList } from "../../../core/api/apiService";
import type { Role, RoleFormData, RoleUpdateData } from "../types"; // مطمئن شو این تایپ‌ها رو توی فایل types.ts داری

const ROLES_ENDPOINT = "/roles";

// --- تایپ‌ها و توابع برای Query ---

export type GetRolesParams = {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
};

export const getRoles = async (
  params?: GetRolesParams,
): Promise<ApiResponseList<Role>> => {
  // از ساختار { params: params } استفاده می‌کنیم که getList درست کار کنه
  const response = await ApiService.getList<Role>(ROLES_ENDPOINT, {
    params: params,
  });
  return response.data;
};

// --- توابع برای Mutation ---

export const createRole = async (payload: RoleFormData): Promise<Role> => {
  const response = await ApiService.post<Role>(ROLES_ENDPOINT, payload);
  // چون ApiService خود data رو در خروجی ApiResponse برمی‌گردونه، نیازی به return response.data نیست
  // اما چون ساختار شما رو دیدم که ApiResponse رو wrap می‌کنه،
  // فرض می‌کنم هدف نهایی یکپارچگی با Promise<Role> هست.
  return response.data;
};

export const updateRole = async (
  id: number,
  payload: RoleUpdateData,
): Promise<Role> => {
  const response = await ApiService.patch<Role>(
    `${ROLES_ENDPOINT}/${id}`,
    payload,
  );
  return response.data;
};

export const deleteRole = async (id: number): Promise<void> => {
  await ApiService.delete(`${ROLES_ENDPOINT}/${id}`);
};
