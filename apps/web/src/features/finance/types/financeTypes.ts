// apps/web/src/features/finance/types/financeTypes.ts

export type PaymentType = "hourly" | "monthly";

export interface ProjectEarnings {
  project_id: string;
  project_name: string;
  payment_type: PaymentType | null;
  rate: number;
  total_worked_hours: number | null;
  total_earned: number;
  total_paid: number;
  current_balance: number;
  currency: string;
  salary_override: boolean;
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

// Project Billing (for managers)
export interface ProjectBillingMember {
  user_id: string;
  username: string;
  first_name: string;
  last_name: string;
  specialty: string;
  allocation_percentage: number;
  payment_type: PaymentType | null;
  rate: number;
  currency: string;
  salary_override: boolean;
  total_worked_hours: number | null;
  total_cost: number;
}

export interface ProjectBilling {
  project_id: string;
  project_name: string;
  total_cost: number;
  currency: string;
  members: ProjectBillingMember[];
  pagination?: {
    total_results: number;
    current_page: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
}
