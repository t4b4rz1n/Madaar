import ApiService from "../../../core/api/apiService";
import type { User, UserFormData, UserUpdateData } from "../types";

export const getUsers = (params: URLSearchParams) => {
  // تبدیل URLSearchParams به یک آبجکت ساده برای ApiService
  const paramsObj = Object.fromEntries(params.entries());
  return ApiService.getList<User>("panel/users/", paramsObj);
};

export const createUser = (data: UserFormData) =>
  ApiService.post<User>("panel/users/", data);

export const updateUser = (id: number, data: UserUpdateData) =>
  ApiService.patch<User>(`panel/users/${id}/`, data);

export const deleteUser = (id: number) =>
  ApiService.delete(`panel/users/${id}/`);
