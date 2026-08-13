export interface UserProfile {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  is_staff: boolean;
  profile_image: string | null;
  telegram_connected?: boolean;
  notify_via_email?: boolean;
  notify_via_telegram?: boolean;
}

export interface ProfileUpdateData {
  first_name?: string;
  last_name?: string;
  email?: string;
  password?: string;
  password_confirm?: string;
  avatar?: File;
  profile_image?: File | string | null;
  notify_via_email?: boolean;
  notify_via_telegram?: boolean;
}
