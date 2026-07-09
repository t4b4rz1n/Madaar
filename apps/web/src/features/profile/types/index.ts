export interface UserProfile {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  is_staff: boolean;
  profile_image_url: string | null;
}

export interface ProfileUpdateData {
  first_name?: string;
  last_name?: string;
  password?: string;
  password_confirm?: string;
}
