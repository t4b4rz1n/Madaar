import ApiService from "../../../core/api/apiService";
import { getErrorMessage } from "../../../core/utils/errorHandler";
import type { AuthResponse, LoginCredentials } from "../types/authTypes";

const AUTH_ENDPOINTS = {
  LOGIN: "/auth/login/",
};

export const loginRequest = async (
  credentials: LoginCredentials
): Promise<AuthResponse> => {
  try {
    const response = await ApiService.post<AuthResponse>(
      AUTH_ENDPOINTS.LOGIN,
      credentials
    );
    return response.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Login failed. Please check your credentials.")
    );
  }
};
