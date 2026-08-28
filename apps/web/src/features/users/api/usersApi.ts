import ApiService from "../../../core/api/apiService";
import type { User, UserFormData, UserUpdateData } from "../types";

export const getUsers = (params: URLSearchParams) => {
  return ApiService.getList<User>(`panel/users/?${params.toString()}`);
};

export const createUser = (data: UserFormData) =>
  ApiService.post<User>("panel/users/", data);

export const updateUser = (id: string | number, data: UserUpdateData) =>
  ApiService.patch<User>(`panel/users/${id}/`, data);

export const deleteUser = (id: string | number) =>
  ApiService.delete(`panel/users/${id}/`);

/** Fetch users who are not assigned to any organization */
export const getUnassignedUsers = async (): Promise<User[]> => {
  const response = await ApiService.getList<User>(
    "panel/users/?unassigned=true",
  );
  return response.data?.results ?? [];
};
