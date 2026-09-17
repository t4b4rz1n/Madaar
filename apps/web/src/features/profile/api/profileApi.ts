import ApiService from "../../../core/api/apiService";
import type { ProfileUpdateData, UserProfile } from "../types";

export const getProfile = () => {
  return ApiService.get<UserProfile>("accounts/profile/");
};

export const updateProfile = (data: ProfileUpdateData) => {
  const formData = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      formData.append(key, value);
    }
  });

  return ApiService.patch<UserProfile>("accounts/profile/", formData);
};

export const getTelegramMagicLink = () => {
  return ApiService.post<{ magic_link?: string, url?: string }>("automations/telegram/magic-link/");
};
