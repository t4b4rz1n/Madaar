import type { User } from "../features/users/types";
import type { Discount } from "../features/discounts/types";

import type { Notification } from "../features/notifications/types";
import type { UserProfile } from "../features/profile/types";
import type {
  Ticket,
  TicketTypeItem,
  TicketMessage,
  TicketFormData,
} from "../features/tickets/types";

// Stateful mock database held in memory
export const mockProfile: UserProfile = {
  id: 1,
  username: "admin",
  first_name: "John",
  last_name: "Doe",
  email: "admin@example.com",
  is_staff: true,
  profile_image: null,
};

export let mockUsers: User[] = [
  {
    id: 1,
    username: "admin",
    email: "admin@example.com",
    first_name: "John",
    last_name: "Doe",
    is_active: true,
    is_staff: true,
    profile_image: null,
  },
  {
    id: 2,
    username: "sarah_k",
    email: "sarah.k@example.com",
    first_name: "Sarah",
    last_name: "Kerrigan",
    is_active: true,
    is_staff: false,
    profile_image: null,
  },
  {
    id: 3,
    username: "jim_raynor",
    email: "jim.r@example.com",
    first_name: "Jim",
    last_name: "Raynor",
    is_active: true,
    is_staff: false,
    profile_image: null,
  },
  {
    id: 4,
    username: "zeratul_void",
    email: "zeratul@example.com",
    first_name: "Zeratul",
    last_name: "Protos",
    is_active: false,
    is_staff: false,
    profile_image: null,
  },
  {
    id: 5,
    username: "artanis_hierarch",
    email: "artanis@example.com",
    first_name: "Artanis",
    last_name: "Hierarch",
    is_active: true,
    is_staff: true,
    profile_image: null,
  },
  {
    id: 6,
    username: "nova_terra",
    email: "nova@example.com",
    first_name: "Nova",
    last_name: "Terra",
    is_active: true,
    is_staff: false,
    profile_image: null,
  },
  {
    id: 7,
    username: "tassadar_hero",
    email: "tassadar@example.com",
    first_name: "Tassadar",
    last_name: "Templar",
    is_active: false,
    is_staff: true,
    profile_image: null,
  },
  {
    id: 8,
    username: "fenix_dragoon",
    email: "fenix@example.com",
    first_name: "Fenix",
    last_name: "Steward",
    is_active: true,
    is_staff: false,
    profile_image: null,
  },
  {
    id: 9,
    username: "valerian_mengsk",
    email: "valerian@example.com",
    first_name: "Valerian",
    last_name: "Mengsk",
    is_active: true,
    is_staff: false,
    profile_image: null,
  },
  {
    id: 10,
    username: "abathur_evolve",
    email: "abathur@example.com",
    first_name: "Abathur",
    last_name: "Zerg",
    is_active: true,
    is_staff: false,
    profile_image: null,
  },
  {
    id: 11,
    username: "dehak_pack",
    email: "dehaka@example.com",
    first_name: "Dehaka",
    last_name: "Primal",
    is_active: true,
    is_staff: false,
    profile_image: null,
  },
  {
    id: 12,
    username: "alarak_highlord",
    email: "alarak@example.com",
    first_name: "Alarak",
    last_name: "Taldirim",
    is_active: true,
    is_staff: true,
    profile_image: null,
  },
];

export let mockDiscounts: Discount[] = [
  {
    id: "d1",
    code: "WELCOME20",
    description: "20% discount for new registered users",
    percent: 20,
    max_usage: 100,
    current_usage: 45,
    expiration_date: "2026-12-31T23:59:59Z",
    is_active: true,
    is_expired: false,
    is_fully_used: false,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "d2",
    code: "SUMMER50",
    description: "Big summer sale discount code",
    percent: 50,
    max_usage: 50,
    current_usage: 50,
    expiration_date: "2026-08-31T23:59:59Z",
    is_active: true,
    is_expired: false,
    is_fully_used: true,
    created_at: "2026-06-01T10:00:00Z",
  },
  {
    id: "d3",
    code: "BLACKFRIDAY",
    description: "Black Friday limited discount",
    percent: 70,
    max_usage: 1000,
    current_usage: 852,
    expiration_date: "2025-11-30T23:59:59Z",
    is_active: false,
    is_expired: true,
    is_fully_used: false,
    created_at: "2025-11-20T12:00:00Z",
  },
  {
    id: "d4",
    code: "STAFF15",
    description: "Internal staff discount code",
    percent: 15,
    max_usage: 200,
    current_usage: 12,
    expiration_date: "2027-01-01T00:00:00Z",
    is_active: true,
    is_expired: false,
    is_fully_used: false,
    created_at: "2026-01-15T08:30:00Z",
  },
  {
    id: "d5",
    code: "GOLDEN_YEAR",
    description: "Exclusive new year coupon",
    percent: 40,
    max_usage: 10,
    current_usage: 10,
    expiration_date: "2026-01-05T00:00:00Z",
    is_active: true,
    is_expired: true,
    is_fully_used: true,
    created_at: "2025-12-25T18:00:00Z",
  },
];

export type MockPermission = {
  id: string;
  name: string;
};

export type MockRole = {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  is_staff: boolean;
  permissions: MockPermission[];
};

export const mockPermissions: MockPermission[] = [
  { id: "user.create", name: "Create User" },
  { id: "user.read", name: "Read Users" },
  { id: "role.create", name: "Create Role" },
  { id: "role.update", name: "Update Role" },
  { id: "ticket.manage", name: "Manage Tickets" },
];

export let mockRoles: MockRole[] = [
  {
    id: 1,
    name: "Super Admin",
    description:
      "Full access to the entire system and management of users and permissions.",
    is_active: true,
    is_staff: true,
    permissions: [...mockPermissions],
  },
  {
    id: 2,
    name: "Support",
    description: "Manage tickets and notifications.",
    is_active: true,
    is_staff: false,
    permissions: mockPermissions.filter((permission) =>
      ["ticket.manage", "user.read"].includes(permission.id),
    ),
  },
  {
    id: 3,
    name: "Regular User",
    description: "Basic role with minimum permissions.",
    is_active: true,
    is_staff: false,
    permissions: [],
  },
];

export const mockNotifications: Notification[] = [
  {
    id: "n1",
    text: "Database maintenance scheduled for Sunday at 02:00 AM UTC.",
    link: "https://example.com/maintenance",
    seen: false,
    created_at: "2026-06-20T12:00:00Z",
  },
  {
    id: "n2",
    text: "Version 1.2.0 deployed successfully. Added discount code progress bars.",
    link: "https://example.com/changelog/1.2.0",
    seen: true,
    created_at: "2026-06-19T15:30:00Z",
  },
  {
    id: "n3",
    text: "Security audit passed with zero high-risk vulnerabilities.",
    link: "",
    seen: true,
    created_at: "2026-06-15T09:00:00Z",
  },
];

export let mockTicketTypes: TicketTypeItem[] = [
  { id: 1, name: "Technical Support", created_at: "2026-06-18T10:00:00Z" },
  { id: 2, name: "Billing & Sales", created_at: "2026-06-19T11:00:00Z" },
  { id: 3, name: "General Inquiry", created_at: "2026-06-20T12:00:00Z" },
];

export const mockTickets: Ticket[] = [
  {
    id: 1,
    title: "Cannot access my api key",
    ticket_type: "Technical Support",
    priority: "high",
    status: "open",
    user: { username: "sarah_k", email: "sarah.k@example.com" },
    created_at: "2026-06-20T09:00:00Z",
  },
  {
    id: 2,
    title: "Wrong billing charge on invoice #1042",
    ticket_type: "Billing & Sales",
    priority: "medium",
    status: "answered",
    user: { username: "jim_raynor", email: "jim.r@example.com" },
    created_at: "2026-06-19T11:20:00Z",
  },
  {
    id: 3,
    title: "How do I upgrade to the Enterprise plan?",
    ticket_type: "General Inquiry",
    priority: "low",
    status: "closed",
    user: { username: "nova_terra", email: "nova@example.com" },
    created_at: "2026-06-18T14:00:00Z",
  },
];

export const mockTicketMessages: Record<number, TicketMessage[]> = {
  1: [
    {
      id: 1,
      text: "I am trying to retrieve my billing api keys but the screen remains blank. Please help.",
      sender: { username: "sarah_k", is_staff: false },
      created_at: "2026-06-20T09:00:00Z",
    },
  ],
  2: [
    {
      id: 2,
      text: "I was billed for 500 active users instead of 250. Please issue a refund.",
      sender: { username: "jim_raynor", is_staff: false },
      created_at: "2026-06-19T11:20:00Z",
    },
    {
      id: 3,
      text: "Hello Jim, I am looking into this invoice right now. Will update you shortly.",
      sender: { username: "admin", is_staff: true },
      created_at: "2026-06-19T15:00:00Z",
    },
  ],
  3: [
    {
      id: 4,
      text: "We are expanding our team and want to know the pricing and features for the enterprise tier.",
      sender: { username: "nova_terra", is_staff: false },
      created_at: "2026-06-18T14:00:00Z",
    },
    {
      id: 5,
      text: "Hi Nova, I have sent our enterprise deck to your email. Let me know if you would like to schedule a call.",
      sender: { username: "admin", is_staff: true },
      created_at: "2026-06-18T16:30:00Z",
    },
  ],
};

// Mutators to simulate DB state mutations
export const db = {
  users: {
    getAll: () => mockUsers,
    getById: (id: number) => mockUsers.find((u) => u.id === id),
    create: (user: Omit<User, "id">) => {
      const nextId =
        mockUsers.length > 0 ? Math.max(...mockUsers.map((u) => u.id)) + 1 : 1;
      const newUser = { ...user, id: nextId };
      mockUsers.unshift(newUser); // Add to beginning of list
      return newUser;
    },
    update: (id: number, updates: Partial<User>) => {
      const idx = mockUsers.findIndex((u) => u.id === id);
      if (idx !== -1) {
        mockUsers[idx] = { ...mockUsers[idx], ...updates };
        return mockUsers[idx];
      }
      return null;
    },
    delete: (id: number) => {
      const initialLength = mockUsers.length;
      mockUsers = mockUsers.filter((u) => u.id !== id);
      return mockUsers.length < initialLength;
    },
  },
  discounts: {
    getAll: () => mockDiscounts,
    getById: (id: string) => mockDiscounts.find((d) => d.id === id),
    create: (
      discount: Omit<
        Discount,
        "id" | "current_usage" | "is_expired" | "is_fully_used" | "created_at"
      >,
    ) => {
      const nextId = `d${mockDiscounts.length + 1}`;
      const now = new Date();
      const expDate = new Date(discount.expiration_date);
      const newDiscount: Discount = {
        ...discount,
        id: nextId,
        current_usage: 0,
        is_expired: expDate < now,
        is_fully_used: false,
        created_at: now.toISOString(),
      };
      mockDiscounts.unshift(newDiscount);
      return newDiscount;
    },
    update: (id: string, updates: Partial<Discount>) => {
      const idx = mockDiscounts.findIndex((d) => d.id === id);
      if (idx !== -1) {
        const now = new Date();
        const merged = { ...mockDiscounts[idx], ...updates };
        const expDate = new Date(merged.expiration_date);
        merged.is_expired = expDate < now;
        merged.is_fully_used = merged.current_usage >= merged.max_usage;
        mockDiscounts[idx] = merged;
        return mockDiscounts[idx];
      }
      return null;
    },
    delete: (id: string) => {
      const initialLength = mockDiscounts.length;
      mockDiscounts = mockDiscounts.filter((d) => d.id !== id);
      return mockDiscounts.length < initialLength;
    },
  },

  notifications: {
    getAll: () => mockNotifications,
    create: (
      notification: Omit<Notification, "id" | "seen" | "created_at">,
    ) => {
      const nextId = `n${mockNotifications.length + 1}`;
      const newNotification: Notification = {
        ...notification,
        id: nextId,
        seen: false,
        created_at: new Date().toISOString(),
      };
      mockNotifications.unshift(newNotification);
      return newNotification;
    },
  },
  tickets: {
    getAll: () => mockTickets,
    getById: (id: number) => mockTickets.find((t) => t.id === id),
    create: (ticketData: TicketFormData) => {
      const nextId =
        mockTickets.length > 0
          ? Math.max(...mockTickets.map((t) => Number(t.id))) + 1
          : 1;
      const typeItem = mockTicketTypes.find(
        (t) => String(t.id) === ticketData.ticket_type,
      );
      const newTicket: Ticket = {
        id: nextId,
        title: ticketData.title,
        ticket_type: typeItem ? typeItem.name : "Technical Support",
        priority: ticketData.priority,
        status: "open",
        user: { username: "admin", email: "admin@example.com" },
        created_at: new Date().toISOString(),
      };
      mockTickets.unshift(newTicket);
      mockTicketMessages[nextId] = [];
      return newTicket;
    },
    update: (id: number, updates: Partial<Ticket>) => {
      const idx = mockTickets.findIndex((t) => t.id === id);
      if (idx !== -1) {
        mockTickets[idx] = { ...mockTickets[idx], ...updates };
        return mockTickets[idx];
      }
      return null;
    },
    getMessages: (ticketId: number) => mockTicketMessages[ticketId] || [],
    addMessage: (ticketId: number, messageText: string, mediaUrl?: string) => {
      const messages = mockTicketMessages[ticketId] || [];
      const nextId = Date.now();
      const newMessage: TicketMessage = {
        id: nextId,
        text: messageText,
        sender: { username: "admin", is_staff: true },
        attachments: mediaUrl
          ? [
              {
                id: Date.now(),
                file: mediaUrl,
                file_type: "file",
                created_at: new Date().toISOString(),
              },
            ]
          : [],
        created_at: new Date().toISOString(),
      };
      messages.push(newMessage);
      mockTicketMessages[ticketId] = messages;
      return newMessage;
    },
    ticketTypes: {
      getAll: () => mockTicketTypes,
      create: (name: string) => {
        const nextId =
          mockTicketTypes.length > 0
            ? Math.max(...mockTicketTypes.map((t) => Number(t.id))) + 1
            : 1;
        const newItem: TicketTypeItem = {
          id: nextId,
          name,
          created_at: new Date().toISOString(),
        };
        mockTicketTypes.unshift(newItem);
        return newItem;
      },
      update: (id: number, name: string) => {
        const idx = mockTicketTypes.findIndex((t) => t.id === id);
        if (idx !== -1) {
          mockTicketTypes[idx] = { ...mockTicketTypes[idx], name };
          return mockTicketTypes[idx];
        }
        return null;
      },
      delete: (id: number) => {
        const initialLength = mockTicketTypes.length;
        mockTicketTypes = mockTicketTypes.filter((t) => t.id !== id);
        return mockTicketTypes.length < initialLength;
      },
    },
  },
  roles: {
    getAll: () => mockRoles,
    getById: (id: number) => mockRoles.find((role) => role.id === id),
    create: (role: Omit<MockRole, "id">) => {
      const nextId =
        mockRoles.length > 0
          ? Math.max(...mockRoles.map((role) => role.id)) + 1
          : 1;

      const newRole: MockRole = {
        ...role,
        id: nextId,
      };

      mockRoles.unshift(newRole);
      return newRole;
    },
    update: (id: number, updates: Partial<MockRole>) => {
      const idx = mockRoles.findIndex((role) => role.id === id);

      if (idx !== -1) {
        mockRoles[idx] = { ...mockRoles[idx], ...updates };
        return mockRoles[idx];
      }

      return null;
    },
    delete: (id: number) => {
      const initialLength = mockRoles.length;
      mockRoles = mockRoles.filter((role) => role.id !== id);
      return mockRoles.length < initialLength;
    },
  },

  permission: {
    getAll: () => mockPermissions,
    getById: (id: string) =>
      mockPermissions.find((permission) => permission.id === id),
    create: (permission: MockPermission) => {
      mockPermissions.push(permission);
      return permission;
    },
  },
};
