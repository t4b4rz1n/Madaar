import ApiService from "../../../core/api/apiService";
import type { Notification, NotificationFormData } from "../types";

export const getNotificationHistory = (params: URLSearchParams) => {
  return ApiService.getList<Notification>(
    `dashboard/notifications/?${params.toString()}`
  );
};

export const sendNotification = (data: NotificationFormData) =>
  ApiService.post<Notification>("panel/notifications/send-broadcast/", data);
