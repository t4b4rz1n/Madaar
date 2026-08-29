import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuthStore } from "../../auth/store/authStore";
import { updateProfile, getTelegramMagicLink, getProfile } from "../api/profileApi";
import type { ProfileUpdateData } from "../types";

export const useProfileQuery = (refetchInterval: number | false = false) => {
  const updateUser = useAuthStore((state) => state.updateUser);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const response = await getProfile();
      if (response.data) {
        updateUser({
          id: String(response.data.id),
          username: response.data.username,
          first_name: response.data.first_name,
          last_name: response.data.last_name,
          email: response.data.email,
          is_staff: response.data.is_staff,
          profile_image_url: response.data.profile_image,
          notify_via_email: response.data.notify_via_email,
          notify_via_telegram: response.data.notify_via_telegram,
        });
      }
      return response.data;
    },
    enabled: !!user,
    staleTime: 1000 * 60, // 1 minute
    refetchInterval,
  });
};

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
          profile_image_url: response.data.profile_image,
          notify_via_email: response.data.notify_via_email,
          notify_via_telegram: response.data.notify_via_telegram,
        });
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Error updating profile.");
    },
  });
};

export const useTelegramMagicLink = () => {
  return useMutation({
    mutationFn: () => getTelegramMagicLink(),
    onSuccess: (response) => {
      const url = response.data?.magic_link || response.data?.url;
      if (url) {
        window.open(url, "_blank");
      } else {
        toast.error("Invalid response from server. No magic link found.");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Error generating Telegram magic link.");
    },
  });
};
