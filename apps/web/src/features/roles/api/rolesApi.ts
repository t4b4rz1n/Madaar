// apps/web/src/features/roles/api/rolesApi.ts

import ApiService from "../../../core/api/apiService";
import type { ApiResponseList } from "../../../core/api/apiService";
import type { Role, RoleFormData, RoleUpdateData } from "../types";

// افزودن اسلش پایانی برای سازگاری کامل با Django REST Framework
const ROLES_ENDPOINT = "/roles/";

export type GetRolesParams = {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
};

export const getRoles = async (
  params?: GetRolesParams,
): Promise<ApiResponseList<Role>> => {
  const response = await ApiService.getList<Role>(ROLES_ENDPOINT, {
    params: params,
  });
  return response.data;
};

export const createRole = async (payload: RoleFormData): Promise<Role> => {
  const response = await ApiService.post<Role>(ROLES_ENDPOINT, payload);
  return response.data;
};

export const updateRole = async (
  id: number,
  payload: RoleUpdateData,
): Promise<Role> => {
  const response = await ApiService.patch<Role>(
    `${ROLES_ENDPOINT}${id}/`,
    payload,
  );
  return response.data;
};

export const deleteRole = async (id: number): Promise<void> => {
  await ApiService.delete(`${ROLES_ENDPOINT}${id}/`);
};
