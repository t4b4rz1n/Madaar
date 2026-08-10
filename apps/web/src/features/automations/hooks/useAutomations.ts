import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "../../../core/api/apiService";
import { toast } from "sonner";

export interface AutomationRule {
  id: string;
  project: string | null;
  event_type: string;
  action_type: string;
  telegram_group_id: string | null;
  message_template: string;
  recipients: string[];
  is_active: boolean;
  created_at: string;
}

export interface CreateAutomationRulePayload {
  project?: string | null;
  event_type: string;
  action_type: string;
  telegram_group_id?: string | null;
  message_template: string;
  recipients: string[];
  is_active?: boolean;
}

const AUTOMATIONS_KEYS = {
  all: ["automations"] as const,
  lists: () => [...AUTOMATIONS_KEYS.all, "list"] as const,
};

export const useAutomations = () => {
  return useQuery({
    queryKey: AUTOMATIONS_KEYS.lists(),
    queryFn: async () => {
      const response = await apiService.getList<AutomationRule>("/automations/rules/");
      // Depending on how getList is typed, it might return response.data directly or response.data.results
      // Madaar's getList usually returns the data.results or similar, let's assume it returns an array for now based on standard DRF
      // If it returns ApiResponseList, it has `results` field.
      // We will handle it defensively.
      if (Array.isArray(response)) return response;
      if (response && typeof response === 'object' && 'results' in response) return (response as any).results as AutomationRule[];
      if (response && typeof response === 'object' && 'data' in response) {
         if (Array.isArray((response as any).data)) return (response as any).data as AutomationRule[];
         if ((response as any).data.results) return (response as any).data.results as AutomationRule[];
      }
      return [] as AutomationRule[];
    },
  });
};

export const useCreateAutomation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateAutomationRulePayload) => {
      const response = await apiService.post<AutomationRule>("/automations/rules/", payload);
      return response;
    },
    onSuccess: () => {
      toast.success("قانون اتوماسیون با موفقیت ایجاد شد");
      queryClient.invalidateQueries({ queryKey: AUTOMATIONS_KEYS.all });
    },
    onError: () => {
      toast.error("خطا در ایجاد قانون اتوماسیون");
    },
  });
};
