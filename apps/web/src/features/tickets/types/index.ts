export type EntityId = string | number;
export type TicketStatus = "open" | "in_progress" | "answered" | "closed";

export interface Ticket {
  id: EntityId;
  title: string;
  ticket_type: string | TicketTypeItem | null;
  priority: "low" | "medium" | "high";
  status: TicketStatus;
  user: {
    username: string;
    email: string;
  };
  created_at: string;
}

export interface TicketTypeItem {
  id: EntityId;
  name: string;
  created_at: string;
}

export interface TicketFormData {
  title: string;
  text: string;
  ticket_type: string;
  priority: "low" | "medium" | "high";
}

export interface TicketMessage {
  id: EntityId;
  text: string;
  sender: {
    username: string;
    is_staff: boolean;
  };
  attachments?: TicketAttachment[];
  message_type?: string | null;
  created_at: string;
}

export interface TicketAttachment {
  id: EntityId;
  file: string;
  file_type: "image" | "video" | "audio" | "document" | "archive" | "file" | "unknown";
  created_at: string;
}

export interface SendMessageFormData {
  text: string;
}
