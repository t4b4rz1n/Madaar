import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuthStore } from "../../auth/store/authStore";
import { updateProfile } from "../api/profileApi";
import type { ProfileUpdateData } from "../types";

export const useUpdateProfile = () => {
  const updateUser = useAuthStore((state) => state.updateUser);
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: (data: ProfileUpdateData) => updateProfile(data),
    onSuccess: (response) => {
      toast.success("Profile updated successfully.");

      if (user && response.data) {
        updateUser({
          first_name: response.data.first_name,
          last_name: response.data.last_name,
        });
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Error updating profile.");
    },
  });
};
