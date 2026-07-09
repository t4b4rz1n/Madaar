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
import type { TicketFormData } from "../types";

// Tickets hooks
export const useTickets = (
  params: URLSearchParams,
  options?: any
) => {
  return useQuery<any>({
    queryKey: ["tickets", params.toString()],
    queryFn: async () => {
      const response = await getTickets(params);
      return response.data;
    },
    placeholderData: keepPreviousData,
    ...options,
  });
};

export const useTicket = (id: number) => {
  return useQuery({
    queryKey: ["ticket", id],
    queryFn: async () => {
      const response = await getTicket(id);
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

export const useUpdateTicketStatus = (ticketId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: "open" | "answered" | "closed") =>
      updateTicket(ticketId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      toast.success("Ticket status updated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to update ticket status");
    },
  });
};

// Ticket Messages (Chat) hooks
export const useTicketMessages = (ticketId: number, params: URLSearchParams) => {
  return useQuery({
    queryKey: ["ticket-messages", ticketId, params.toString()],
    queryFn: async () => {
      const response = await getTicketMessages(ticketId, params);
      return response.data;
    },
    enabled: !!ticketId,
    placeholderData: keepPreviousData,
  });
};

export const useSendTicketMessage = (ticketId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { text?: string; file?: File }) => {
      const response = await sendTicketMessage(ticketId, data.text, data.file);
      try {
        await updateTicket(ticketId, { status: "answered" });
      } catch (err) {
        console.error("Failed to automatically update ticket status to answered", err);
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-messages", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
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
    mutationFn: ({ id, name }: { id: number; name: string }) =>
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
    mutationFn: (id: number) => deleteTicketType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-types"] });
      toast.success("Ticket category deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to delete ticket category");
    },
  });
};
