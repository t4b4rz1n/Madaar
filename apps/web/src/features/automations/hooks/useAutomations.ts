import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiService } from "../../../core/api/apiService";

export type DeliveryChannel = "telegram" | "email" | "both";

export interface AutomationRule {
  id: string;
  organization: string;
  event_type: string;
  action_type: DeliveryChannel;
  telegram_group_id: string | null;
  message_template: string;
  recipients: string[];
  is_active: boolean;
}

export interface AutomationEvent {
  code: string;
  label: string;
  description: string;
  default_recipients: string[];
  allowed_recipients: string[];
  rule: AutomationRule | null;
}

export interface RecipientChoice {
  code: string;
  label: string;
}

export interface AutomationCatalog {
  events: AutomationEvent[];
  recipient_choices: RecipientChoice[];
}

export interface AutomationRulePayload {
  organization: string;
  event_type: string;
  action_type: DeliveryChannel;
  telegram_group_id?: string | null;
  message_template: string;
  recipients: string[];
  is_active: boolean;
}

export interface OrganizationOption {
  id: string;
  name: string;
}

const key = (organizationId?: string) => ["automation-catalog", organizationId] as const;

export const useOrganizationsForAutomation = () =>
  useQuery({
    queryKey: ["automation-organizations"],
    queryFn: async () => {
      const response = await ApiService.getList<OrganizationOption>("/organizations/");
      return (response.data?.results ?? response.data ?? []) as OrganizationOption[];
    },
  });

export const useAutomationCatalog = (organizationId?: string) =>
  useQuery({
    queryKey: key(organizationId),
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const response = await ApiService.get<AutomationCatalog>("/automations/catalog/", {
        params: { organization: organizationId },
      });
      return response.data;
    },
  });

export const useSaveAutomationRule = (organizationId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: AutomationRulePayload }) => {
      const response = id
        ? await ApiService.patch<AutomationRule>(`/automations/rules/${id}/`, payload)
        : await ApiService.post<AutomationRule>("/automations/rules/", payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Automation rule saved.");
      queryClient.invalidateQueries({ queryKey: key(organizationId) });
    },
    onError: (error: unknown) => {
      const message = typeof error === "object" && error && "message" in error
        ? String(error.message)
        : "Failed to save the automation rule.";
      toast.error(message);
    },
  });
};

export const useResetAutomationRule = (organizationId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await ApiService.delete(`/automations/rules/${id}/`);
    },
    onSuccess: () => {
      toast.success("Default event settings restored.");
      queryClient.invalidateQueries({ queryKey: key(organizationId) });
    },
    onError: () => toast.error("Failed to restore the default event settings."),
  });
};
