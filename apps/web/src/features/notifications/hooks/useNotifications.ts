import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  sendNotification,
  getNotificationHistory,
  getUnreadNotifications,
  markNotificationSeen,
  markAllNotificationsSeen,
} from "../api/notificationsApi";

export const useNotificationHistory = (
  params: URLSearchParams,
  options?: { enabled?: boolean },
) => {
  const queryKey = ["notification-history", params.toString()];
  return useQuery({
    queryKey,
    queryFn: async () => {
      const response = await getNotificationHistory(params);
      return response.data;
    },
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
};

export const useUnreadNotifications = () => {
  return useQuery({
    queryKey: ["notification-unread"],
    queryFn: async () => {
      const response = await getUnreadNotifications();
      return response.data;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
};

export const useMarkNotificationSeen = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markNotificationSeen(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["notification-history"] }),
        queryClient.invalidateQueries({ queryKey: ["notification-unread"] }),
      ]);
    },
    onError: () => {
      toast.error("Failed to mark notification as read.");
    },
  });
};

export const useMarkAllNotificationsSeen = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsSeen,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["notification-history"] }),
        queryClient.invalidateQueries({ queryKey: ["notification-unread"] }),
      ]);
    },
    onError: () => {
      toast.error("Failed to mark all notifications as read.");
    },
  });
};

export const useSendNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendNotification,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notification-history"] });
      toast.success("Notification sent successfully.");
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        error.message ||
        "Failed to send notification.";
      toast.error(errorMessage);
    },
  });
};
