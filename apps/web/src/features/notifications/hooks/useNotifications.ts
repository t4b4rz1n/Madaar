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
} from "../api/notificationsApi";

export const useNotificationHistory = (params: URLSearchParams) => {
  const queryKey = ["notification-history", params.toString()];
  return useQuery({
    queryKey,
    queryFn: async () => {
      const response = await getNotificationHistory(params);
      return response.data;
    },
    placeholderData: keepPreviousData,
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
