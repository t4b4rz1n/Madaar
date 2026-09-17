import ApiService from "../../../core/api/apiService";
import type {
  Ticket,
  TicketTypeItem,
  TicketFormData,
  TicketMessage,
  EntityId,
  TicketStatus,
} from "../types";

// Tickets endpoints
const ticketsBasePath = (isStaff: boolean) =>
  isStaff ? "panel/tickets/" : "support/tickets/";

export const getTickets = (params: URLSearchParams, isStaff: boolean) => {
  return ApiService.getList<Ticket>(ticketsBasePath(isStaff), { params });
};

export const getTicket = (id: EntityId, isStaff: boolean) => {
  return ApiService.get<Ticket>(`${ticketsBasePath(isStaff)}${id}/`);
};

export const createTicket = (data: TicketFormData) => {
  return ApiService.post<Ticket>("support/tickets/", data);
};

type TicketUpdateData = Partial<Omit<TicketFormData, "status">> & { status?: TicketStatus };

export const updateTicket = (id: EntityId, data: TicketUpdateData, isStaff: boolean) => {
  return ApiService.patch<Ticket>(`${ticketsBasePath(isStaff)}${id}/`, data);
};

// Ticket Messages (Chat) endpoints
export const getTicketMessages = (ticketId: EntityId, params: URLSearchParams, isStaff: boolean) => {
  return ApiService.getList<TicketMessage>(
    `${ticketsBasePath(isStaff)}${ticketId}/messages/`,
    { params }
  );
};

export const sendTicketMessage = (ticketId: EntityId, text: string | undefined, file: File | undefined, isStaff: boolean) => {
  const path = `${ticketsBasePath(isStaff)}${ticketId}/messages/`;
  if (file) {
    const formData = new FormData();
    if (text) {
      formData.append("text", text);
    }
    formData.append("attachments", file);
    return ApiService.post<TicketMessage>(path, formData);
  }
  return ApiService.post<TicketMessage>(path, { text });
};

// Ticket Types endpoints
export const getTicketTypes = (params: URLSearchParams) => {
  return ApiService.getList<TicketTypeItem>(
    "support/ticket-types/",
    { params }
  );
};

export const createTicketType = (name: string) => {
  return ApiService.post<TicketTypeItem>("panel/ticket-types/", { name });
};

export const updateTicketType = (id: EntityId, name: string) => {
  return ApiService.put<TicketTypeItem>(`panel/ticket-types/${id}/`, { name });
};

export const deleteTicketType = (id: EntityId) => {
  return ApiService.delete(`panel/ticket-types/${id}/`);
};
