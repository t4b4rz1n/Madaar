export interface Ticket {
  id: number;
  title: string;
  ticket_type: string; // Type name or ID depending on context
  priority: "low" | "medium" | "high";
  status: "open" | "answered" | "closed";
  user: {
    username: string;
    email: string;
  };
  created_at: string;
}

export interface TicketTypeItem {
  id: number;
  name: string;
  created_at: string;
}

export interface TicketFormData {
  title: string;
  ticket_type: number;
  priority: "low" | "medium" | "high";
  status: "open" | "answered" | "closed";
}

export interface TicketMessage {
  id: number;
  text: string;
  sender: {
    username: string;
    is_staff: boolean;
  };
  media?: string | null;
  message_type?: string | null;
  created_at: string;
}

export interface SendMessageFormData {
  text: string;
}
