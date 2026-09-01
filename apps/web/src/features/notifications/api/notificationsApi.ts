import ApiService from "../../../core/api/apiService";
import type { Notification, NotificationFormData } from "../types";

export const getNotificationHistory = (params: URLSearchParams) => {
  return ApiService.getList<Notification>(
    `dashboard/notifications/?${params.toString()}`
  );
};

export const getUnreadNotifications = () => {
  return ApiService.getList<Notification>(
    "dashboard/notifications/unread/?page_size=100"
  );
};

export const markNotificationSeen = (id: string) => {
  return ApiService.patch<Notification>(
    `dashboard/notifications/${id}/mark-seen/`,
    {}
  );
};

export const markAllNotificationsSeen = () => {
  return ApiService.post<{ message: string }>(
    "dashboard/notifications/mark-all-seen/",
    {}
  );
};

export const sendNotification = (data: NotificationFormData) =>
  ApiService.post<Notification>("panel/notifications/send-broadcast/", data);
