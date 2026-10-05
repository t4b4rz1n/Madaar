export interface Notification {
  id: string;
  text: string;
  message_data?: {
    event: string;
    values: Record<string, string>;
  };
  link: string;
  seen: boolean;
  created_at: string;
}

export interface NotificationFormData {
  text: string;
  link?: string;
}
