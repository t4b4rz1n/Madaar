import { useQuery } from "@tanstack/react-query";
import ApiService from "../../../core/api/apiService";
import type {
  UserFinanceDashboard,
  AdminFinanceReport,
  ProjectBilling,
} from "../types/financeTypes";

// ─── User personal dashboard ────────────────────────────────────────────────

export const useMyFinanceDashboard = () => {
  return useQuery({
    queryKey: ["finance", "my-dashboard"],
    queryFn: async () => {
      const response = await ApiService.get<UserFinanceDashboard>("/finance/my-reports/");
      return response.data;
    },
    retry: 1,
  });
};

// ─── Admin org-wide report ───────────────────────────────────────────────────

export interface FinanceFilters {
  page?: number;
  page_size?: number;
  search?: string;
}

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

      const response = await ApiService.get<PaginatedData<AdminFinanceReport>>(
        `/finance/admin/reports/?${params.toString()}`
      );
      return response.data;
    },
    retry: 1,
  });
};

// ─── Project billing breakdown ───────────────────────────────────────────────

export const useProjectBilling = (projectId: string | null, page: number = 1) => {
  return useQuery({
    queryKey: ["finance", "project-billing", projectId, page],
    queryFn: async () => {
      const response = await ApiService.get<ProjectBilling>(
        `/finance/projects/${projectId}/billing/?page=${page}`
      );
      return response.data;
    },
    enabled: Boolean(projectId),
    retry: 1,
  });
};

// ─── Update project member salary ────────────────────────────────────────────

export const updateProjectMemberSalary = async (
  projectId: string | number,
  memberId: string | number,
  data: { salary_type?: string | null; salary_amount?: string | null }
) => {
  const response = await ApiService.patch(
    `/projects/${projectId}/members/${memberId}/salary/`,
    data
  );
  return response.data;
};

export const resetProjectMemberSalary = async (
  projectId: string | number,
  memberId: string | number
) => {
  const response = await ApiService.post(
    `/projects/${projectId}/members/${memberId}/salary/reset/`,
    {}
  );
  return response.data;
};
