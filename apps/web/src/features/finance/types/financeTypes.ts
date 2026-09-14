// apps/web/src/features/finance/types/financeTypes.ts

export type PaymentType = "hourly" | "monthly" | "fixed";

export interface ProjectEarnings {
  project_id: string;
  project_name: string;
  payment_type: PaymentType;
  rate: number;
  total_worked_hours: number | null;
  total_earned: number;
  total_paid: number;
  current_balance: number;
  currency: string;
}

export interface UserFinanceDashboard {
  user_id: string;
  total_income: number;
  total_paid: number;
  current_balance: number;
  currency: string;
  projects: ProjectEarnings[];
}

export interface AdminFinanceReport {
  user_id: string;
  username: string;
  first_name: string;
  last_name: string;
  total_income: number;
  total_paid: number;
  current_balance: number;
  currency: string;
  active_projects: number;
}
