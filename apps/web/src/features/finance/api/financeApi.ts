// apps/web/src/features/finance/api/financeApi.ts
import { useQuery } from "@tanstack/react-query";
import ApiService from "../../../core/api/apiService";
import type { UserFinanceDashboard, AdminFinanceReport } from "../types/financeTypes";

export const useMyFinanceDashboard = () => {
  return useQuery({
    queryKey: ["finance", "my-dashboard"],
    queryFn: async () => {
      const response = await ApiService.get<UserFinanceDashboard>("/finance/my-reports/");
      return response.data;
    },
  });
};

export interface FinanceFilters {
  page?: number;
  page_size?: number;
  search?: string;
}

// Assuming standard paginated response structure for Madaar
interface PaginatedData<T> {
  results: T[];
  total_results: number;
  current_page: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export const useAdminFinanceReports = (filters: FinanceFilters) => {
  return useQuery({
    queryKey: ["finance", "admin-reports", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.append("page", filters.page.toString());
      if (filters.page_size) params.append("page_size", filters.page_size.toString());
      if (filters.search) params.append("search", filters.search);

      const response = await ApiService.get<PaginatedData<AdminFinanceReport>>(`/finance/admin/reports/?${params.toString()}`);
      return response.data;
    },
  });
};
