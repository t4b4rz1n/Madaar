import ApiService from "../../../core/api/apiService";
import type { ProfileUpdateData, UserProfile } from "../types";

export const updateProfile = (data: ProfileUpdateData) => {
  return ApiService.patch<UserProfile>("accounts/profile/update/", data);
};
