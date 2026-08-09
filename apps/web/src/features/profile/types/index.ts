export interface UserProfile {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  is_staff: boolean;
  profile_image: string | null;
  telegram_connected?: boolean;
}

export interface ProfileUpdateData {
  first_name?: string;
  last_name?: string;
  profile_image?: File;
  password?: string;
  password_confirm?: string;
}
