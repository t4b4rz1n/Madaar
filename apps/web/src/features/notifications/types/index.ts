export interface Notification {
  id: string;
  text: string;
  link: string;
  seen: boolean;
  created_at: string;
}

export interface NotificationFormData {
  text: string;
  link?: string;
}
