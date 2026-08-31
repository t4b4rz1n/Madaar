import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getTickets,
  getTicket,
  createTicket,
  updateTicket,
  getTicketMessages,
  sendTicketMessage,
  getTicketTypes,
  createTicketType,
  updateTicketType,
  deleteTicketType,
} from "../api/ticketsApi";
import type { EntityId, TicketFormData } from "../types";
import { usePermissions } from "../../auth/hooks/usePermissions";

const useIsManager = () => {
  const { hasAnyPermission, isStaff } = usePermissions();
  return isStaff || hasAnyPermission(["org.manage_members", "org.manage_settings"]);
};

// Tickets hooks
export const useTickets = (
  params: URLSearchParams,
  options?: any
) => {
  const isManager = useIsManager();
  return useQuery<any>({
    queryKey: ["tickets", isManager ? "staff" : "user", params.toString()],
    queryFn: async () => {
      const response = await getTickets(params, isManager);
      return response.data;
    },
    placeholderData: keepPreviousData,
    ...options,
  });
};

export const useTicket = (id: string) => {
  const isManager = useIsManager();
  return useQuery({
    queryKey: ["ticket", isManager ? "staff" : "user", id],
    queryFn: async () => {
      const response = await getTicket(id, isManager);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreateTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TicketFormData) => createTicket(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Ticket created successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to create ticket");
    },
  });
};

export const useUpdateTicketStatus = (ticketId: string) => {
  const queryClient = useQueryClient();
  const isManager = useIsManager();
  const scope = isManager ? "staff" : "user";
  return useMutation({
    mutationFn: (status: "open" | "in_progress" | "answered" | "closed") =>
      updateTicket(ticketId, { status }, isManager),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", scope, ticketId] });
      toast.success("Ticket status updated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to update ticket status");
    },
  });
};

// Ticket Messages (Chat) hooks
export const useTicketMessages = (ticketId: string, params: URLSearchParams) => {
  const isManager = useIsManager();
  return useQuery({
    queryKey: ["ticket-messages", isManager ? "staff" : "user", ticketId, params.toString()],
    queryFn: async () => {
      const response = await getTicketMessages(ticketId, params, isManager);
      return response.data;
    },
    enabled: !!ticketId,
    placeholderData: keepPreviousData,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  });
};

export const useSendTicketMessage = (ticketId: string) => {
  const queryClient = useQueryClient();
  const isManager = useIsManager();
  const scope = isManager ? "staff" : "user";
  return useMutation({
    mutationFn: async (data: { text?: string; file?: File }) => {
      return sendTicketMessage(ticketId, data.text, data.file, isManager);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["ticket-messages", scope, ticketId],
        refetchType: "active",
      });
      queryClient.invalidateQueries({ queryKey: ["ticket", scope, ticketId] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to send message");
    },
  });
};

// Ticket Types hooks
export const useTicketTypes = (params: URLSearchParams) => {
  return useQuery({
    queryKey: ["ticket-types", params.toString()],
    queryFn: async () => {
      const response = await getTicketTypes(params);
      return response.data;
    },
    placeholderData: keepPreviousData,
  });
};

export const useCreateTicketType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createTicketType(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-types"] });
      toast.success("Ticket category created successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to create ticket category");
    },
  });
};

export const useUpdateTicketType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: EntityId; name: string }) =>
      updateTicketType(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-types"] });
      toast.success("Ticket category updated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to update ticket category");
    },
  });
};

export const useDeleteTicketType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: EntityId) => deleteTicketType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-types"] });
      toast.success("Ticket category deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to delete ticket category");
    },
  });
};
