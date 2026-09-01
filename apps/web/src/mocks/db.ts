import type { User } from "../features/users/types";
import type { Discount } from "../features/discounts/types";
import type { Team } from "../features/teams/types";
import type { Notification } from "../features/notifications/types";
import type { UserProfile } from "../features/profile/types";
import type {
  Ticket,
  TicketTypeItem,
  TicketMessage,
  TicketFormData,
} from "../features/tickets/types";
import type {
  Project,
  ProjectMember,
  Milestone,
  ProjectActivity,
} from "../features/projects/types";
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
    id: "1",
    username: "admin",
    email: "admin@example.com",
    first_name: "John",
    last_name: "Doe",
    is_active: true,
    is_staff: true,
    role_id: "1",
    avatar: null,
  },
  {
    id: "2",
    username: "sarah_k",
    email: "sarah.k@example.com",
    first_name: "Sarah",
    last_name: "Kerrigan",
    is_active: true,
    is_staff: false,
    role_id: "2",
    avatar: null,
  },
  {
    id: "3",
    username: "jim_raynor",
    email: "jim.r@example.com",
    first_name: "Jim",
    last_name: "Raynor",
    is_active: true,
    is_staff: false,
    role_id: "3",
    avatar: null,
  },
  {
    id: "4",
    username: "zeratul_void",
    email: "zeratul@example.com",
    first_name: "Zeratul",
    last_name: "Protos",
    is_active: false,
    is_staff: false,
    role_id: "5",
    avatar: null,
  },
  {
    id: "5",
    username: "artanis_hierarch",
    email: "artanis@example.com",
    first_name: "Artanis",
    last_name: "Hierarch",
    is_active: true,
    is_staff: false,
    role_id: "6",
    avatar: null,
  },
  {
    id: "6",
    username: "nova_terra",
    email: "nova@example.com",
    first_name: "Nova",
    last_name: "Terra",
    is_active: true,
    is_staff: false,
    role_id: "7",
    avatar: null,
  },
  {
    id: "7",
    username: "tassadar_hero",
    email: "tassadar@example.com",
    first_name: "Tassadar",
    last_name: "Templar",
    is_active: false,
    is_staff: true,
    role_id: "8",
    avatar: null,
  },
  {
    id: "8",
    username: "fenix_dragoon",
    email: "fenix@example.com",
    first_name: "Fenix",
    last_name: "Steward",
    is_active: true,
    is_staff: false,
    role_id: "3",
    avatar: null,
  },
  {
    id: "9",
    username: "valerian_mengsk",
    email: "valerian@example.com",
    first_name: "Valerian",
    last_name: "Mengsk",
    is_active: true,
    is_staff: false,
    role_id: "3",
    avatar: null,
  },
  {
    id: "10",
    username: "abathur_evolve",
    email: "abathur@example.com",
    first_name: "Abathur",
    last_name: "Zerg",
    is_active: true,
    is_staff: false,
    role_id: "3",
    avatar: null,
  },
  {
    id: "11",
    username: "dehak_pack",
    email: "dehaka@example.com",
    first_name: "Dehaka",
    last_name: "Primal",
    is_active: true,
    is_staff: false,
    role_id: "3",
    avatar: null,
  },
  {
    id: "12",
    username: "alarak_highlord",
    email: "alarak@example.com",
    first_name: "Alarak",
    last_name: "Taldirim",
    is_active: true,
    is_staff: true,
    role_id: "1",
    avatar: null,
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

export type MockRole = {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  is_staff: boolean;
  permissions: string[]; // تغییر از MockPermission[] به string[]
};

export let mockRoles: MockRole[] = [
  {
    id: 1,
    name: "Super Admin",
    description: "Full access to system management, users, tickets, and roles.",
    is_active: true,
    is_staff: true,
    permissions: [
      "users.manage",
      "users.view",
      "roles.manage",
      "discounts.view",
      "notifications.view",
      "notifications.send",
      "teams.view",
      "teams.manage",
      "tickets.view",
      "tickets.manage",
      "projects.view",
      "projects.manage",
    ],
  },
  {
    id: 2,
    name: "Frontend",
    description: "Frontend developer for UI design and client-side features.",
    is_active: true,
    is_staff: false,
    permissions: [
      "notifications.view",
      "notifications.send",
      "tickets.view",
      "tickets.manage",
    ],
  },
  {
    id: 3,
    name: "Backend",
    description: "Backend developer for API management and system core.",
    is_active: true,
    is_staff: false,
    permissions: [
      "notifications.view",
      "notifications.send",
      "tickets.view",
      "tickets.manage",
    ],
  },
  {
    id: 4,
    name: "Support",
    description: "Technical system support and user ticket management.",
    is_active: true,
    is_staff: false,
    permissions: ["tickets.view", "tickets.manage", "users.manage"],
  },
  {
    id: 5,
    name: "Regular User",
    description: "Regular user with minimum basic system permissions.",
    is_active: true,
    is_staff: false,
    permissions: [],
  },
  // --- Adding business roles according to requirements document ---
  {
    id: 6,
    name: "Team Lead",
    description:
      "Team lead; managing teams, coordinating members, and reviewing tickets.",
    is_active: true,
    is_staff: false,
    permissions: ["teams.view", "teams.manage", "tickets.view", "users.view"],
  },
  {
    id: 7,
    name: "Accountant",
    description: "Accountant; viewing discount codes and financial tickets.",
    is_active: true,
    is_staff: false,
    permissions: ["discounts.view", "tickets.view"],
  },
  {
    id: 8,
    name: "HR",
    description:
      "Human Resources; managing personnel status, users, and reviewing internal tickets.",
    is_active: true,
    is_staff: false,
    permissions: ["users.manage", "tickets.view"],
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

export let mockTeams: Team[] = [
  {
    id: 1,
    name: "Technical & Development",
    description: "Frontend and backend development team of the Modares system",
    lead_id: "2", // Sara (currently can have developer or team lead role)
    is_active: true,
    created_at: "2026-01-01T12:00:00Z",
  },
  {
    id: 2,
    name: "Support & Operations",
    description: "Technical user support and system monitoring",
    lead_id: "3", // Jim Raynor
    is_active: true,
    created_at: "2026-02-15T09:30:00Z",
  },
];

export let mockProjects: Project[] = [
  {
    id: "1",
    organization: "1",
    name: "Modares (Internal Management System)",
    description:
      "Development of an integrated team OS with gamification and task management",
    status: "active", // به جای in_progress
    prefix: "MAD",
    budget: 500000000,
    budget_currency: "IRR",
    start_date: "2026-01-01T00:00:00Z",
    deadline: "2026-12-30T00:00:00Z",
    members_count: 2,
    progress_percentage: 35,
    created_at: "2026-01-01T10:00:00Z",
    updated_at: "2026-06-20T10:00:00Z",
  },
];

export const mockProjectMembers: ProjectMember[] = [
  {
    id: "1",
    project: "1",
    user: {
      id: 1,
      username: "johndoe",
      first_name: "John",
      last_name: "Doe",
    },
    specialty: "Project Manager",
    allocation_percentage: 100,
    is_active: true,
    created_at: "2026-01-01T10:00:00Z",
    updated_at: "2026-01-01T10:00:00Z",
  },
  {
    id: "2",
    project: "1",
    user: {
      id: 2,
      username: "sarahk",
      first_name: "Sarah",
      last_name: "Kerrigan",
    },
    specialty: "Frontend Lead",
    allocation_percentage: 80,
    is_active: true,
    created_at: "2026-01-01T10:00:00Z",
    updated_at: "2026-01-01T10:00:00Z",
  },
];

export const mockMilestones: Milestone[] = [
  {
    id: "1",
    project: "1",
    title: "Database Architecture Design",
    status: "completed",
    target_date: "2026-02-15T00:00:00Z",
    sequence: 1,
    weight: 20,
    created_at: "2026-01-01T10:00:00Z",
    updated_at: "2026-02-15T10:00:00Z",
  },
  {
    id: "2",
    project: "1",
    title: "Phase 1 Completion (MVP)",
    status: "in_progress",
    target_date: "2026-07-30T00:00:00Z",
    sequence: 2,
    weight: 80,
    created_at: "2026-01-01T10:00:00Z",
    updated_at: "2026-01-01T10:00:00Z",
  },
];

export const mockActivities: ProjectActivity[] = [
  {
    id: "1",
    project: "1",
    actor: {
      id: 1,
      username: "johndoe",
    },
    event_type: "project_created",
    entity_type: "project",
    entity_id: "1",
    created_at: "2026-01-01T10:00:00Z",
  },
];
export const db = {
  users: {
    getAll: () => mockUsers,
    getById: (id: string) => mockUsers.find((u) => u.id === id),
    create: (user: Omit<User, "id">) => {
      const nextId = String(
        mockUsers.length > 0
          ? Math.max(...mockUsers.map((u) => Number(u.id) || 0)) + 1
          : 1,
      );
      const newUser: User = { ...user, id: nextId };
      mockUsers.unshift(newUser); // Add to beginning of list
      return newUser;
    },
    update: (id: string, updates: Partial<User>) => {
      const idx = mockUsers.findIndex((u) => u.id === id);
      if (idx !== -1) {
        mockUsers[idx] = { ...mockUsers[idx], ...updates };
        return mockUsers[idx];
      }
      return null;
    },
    delete: (id: string) => {
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
  teams: {
    getAll: () => mockTeams,
    getById: (id: number) => mockTeams.find((t) => t.id === id),
    create: (team: Omit<Team, "id">) => {
      const nextId =
        mockTeams.length > 0 ? Math.max(...mockTeams.map((t) => t.id)) + 1 : 1;
      const newTeam = {
        ...team,
        id: nextId,
        created_at: new Date().toISOString(),
      };
      mockTeams.unshift(newTeam);
      return newTeam;
    },
    update: (id: number, updates: Partial<Team>) => {
  const idx = mockTeams.findIndex((t) => t.id === id);
      if (idx !== -1) {
        mockTeams[idx] = {
          ...mockTeams[idx],
          ...updates,
          updated_at: new Date().toISOString(),
        };
        return mockTeams[idx];
      }
      return null;
    },
    delete: (id: number) => {
      const initialLength = mockTeams.length;
      mockTeams = mockTeams.filter((t) => t.id !== id);
      return mockTeams.length < initialLength;
    },
  },
  // اضافه کردن این بخش به داخل شیء db
  projects: {
    getAll: () => mockProjects,
    getById: (id: string | number) =>
      mockProjects.find((p) => String(p.id) === String(id)),
    create: (data: Partial<Project>) => {
      const nextId = String(mockProjects.length + 1);
      const newProject: Project = {
        id: nextId,
        organization: data.organization || "1",
        name: data.name || "Untitled Project",
        description: data.description || "",
        prefix: data.prefix || "PRJ",
        budget: data.budget,
        budget_currency: data.budget_currency || "IRR",
        start_date: data.start_date || new Date().toISOString().split("T")[0],
        deadline: data.deadline,
        status: "draft", // به جای planning
        members_count: 1,
        progress_percentage: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockProjects.unshift(newProject);
      return newProject;
    },
    update: (id: string | number, updates: Partial<Project>) => {
      const idx = mockProjects.findIndex((p) => String(p.id) === String(id));
      if (idx !== -1) {
        mockProjects[idx] = {
          ...mockProjects[idx],
          ...updates,
          updated_at: new Date().toISOString(),
        };
        return mockProjects[idx];
      }
      return null;
    },
    delete: (id: string | number) => {
      const initialLength = mockProjects.length;
      mockProjects = mockProjects.filter((p) => String(p.id) !== String(id));
      return mockProjects.length < initialLength;
    },
    archive: (id: string | number) => {
      const idx = mockProjects.findIndex((p) => String(p.id) === String(id));
      if (idx !== -1) {
        mockProjects[idx].status = "archived";
        mockProjects[idx].archived_at = new Date().toISOString();
        mockProjects[idx].updated_at = new Date().toISOString();
        return mockProjects[idx];
      }
      return null;
    },
    complete: (id: string | number) => {
      const idx = mockProjects.findIndex((p) => String(p.id) === String(id));
      if (idx !== -1) {
        mockProjects[idx].status = "completed";
        mockProjects[idx].completed_at = new Date().toISOString();
        mockProjects[idx].progress_percentage = 100;
        mockProjects[idx].updated_at = new Date().toISOString();
        return mockProjects[idx];
      }
      return null;
    },

    members: {
      getAll: (projectId: string | number) =>
        mockProjectMembers.filter(
          (m) => String(m.project) === String(projectId),
        ),
      add: (projectId: string | number, data: Partial<ProjectMember>) => {
        const newMember: ProjectMember = {
          id: String(Date.now()),
          project: projectId,
          user: data.user || {
            id: Date.now(),
            username: "newuser",
            first_name: "New",
            last_name: "User",
          },
          specialty: data.specialty || "General Contributor",
          allocation_percentage: data.allocation_percentage || 100,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        mockProjectMembers.unshift(newMember);
        return newMember;
      },
    },
    milestones: {
      getAll: (projectId: string | number) =>
        mockMilestones.filter((m) => String(m.project) === String(projectId)),
      create: (projectId: string | number, data: Partial<Milestone>) => {
        const newMilestone: Milestone = {
          id: String(Date.now()),
          project: projectId,
          title: data.title || "New Milestone",
          description: data.description || "",
          status: "pending",
          target_date: data.target_date || new Date().toISOString(),
          sequence: mockMilestones.length + 1,
          weight: data.weight || 10,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        mockMilestones.unshift(newMilestone);
        return newMilestone;
      },
    },
    activities: {
      getAll: (projectId: string | number) =>
        mockActivities.filter((a) => String(a.project) === String(projectId)),
    },
  },
};
