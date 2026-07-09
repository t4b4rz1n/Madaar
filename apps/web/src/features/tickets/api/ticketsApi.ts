import ApiService from "../../../core/api/apiService";
import type {
  Ticket,
  TicketTypeItem,
  TicketFormData,
  TicketMessage,
} from "../types";

// Tickets endpoints
export const getTickets = (params: URLSearchParams) => {
  return ApiService.getList<Ticket>("support/tickets/", { params });
};

export const getTicket = (id: number) => {
  return ApiService.get<Ticket>(`support/tickets/${id}/`);
};

export const createTicket = (data: TicketFormData) => {
  return ApiService.post<Ticket>("support/tickets/", data);
};

export const updateTicket = (id: number, data: Partial<TicketFormData>) => {
  return ApiService.patch<Ticket>(`support/tickets/${id}/`, data);
};

// Ticket Messages (Chat) endpoints
export const getTicketMessages = (ticketId: number, params: URLSearchParams) => {
  return ApiService.getList<TicketMessage>(
    `support/tickets/${ticketId}/messages/`,
    { params }
  );
};

export const sendTicketMessage = (ticketId: number, text?: string, file?: File) => {
  if (file) {
    const formData = new FormData();
    if (text) {
      formData.append("text", text);
    }
    formData.append("media", file);
    return ApiService.post<TicketMessage>(
      `support/tickets/${ticketId}/messages/`,
      formData
    );
  }
  return ApiService.post<TicketMessage>(
    `support/tickets/${ticketId}/messages/`,
    { text }
  );
};

// Ticket Types endpoints
export const getTicketTypes = (params: URLSearchParams) => {
  return ApiService.getList<TicketTypeItem>(
    "support/ticket-types/",
    { params }
  );
};

export const createTicketType = (name: string) => {
  return ApiService.post<TicketTypeItem>("support/ticket-types/", { name });
};

export const updateTicketType = (id: number, name: string) => {
  return ApiService.put<TicketTypeItem>(`support/ticket-types/${id}/`, { name });
};

export const deleteTicketType = (id: number) => {
  return ApiService.delete(`support/ticket-types/${id}/`);
};
