export interface Discount {
  id: string;
  code: string;
  description: string;
  percent: number;
  max_usage: number;
  current_usage: number;
  expiration_date: string;
  is_active: boolean;
  is_expired: boolean;
  is_fully_used: boolean;
  created_at: string;
}

export interface DiscountFormData {
  code: string;
  description: string;
  percent: number;
  max_usage: number;
  expiration_date: string;
  is_active: boolean;
}
