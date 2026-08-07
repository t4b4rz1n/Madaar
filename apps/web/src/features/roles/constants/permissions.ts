// apps/web/src/features/roles/constants/permissions.ts

export interface PermissionItem {
  id: string;
  label: string;
  group: string;
}

export const SYSTEM_PERMISSIONS: PermissionItem[] = [
  // Users
  { id: "users.manage", label: "Manage Users", group: "USERS" },
  { id: "users.view", label: "View Users", group: "USERS" },

  // Roles
  { id: "roles.manage", label: "Manage Roles", group: "ROLES" },

  // Discounts module
  { id: "discounts.view", label: "View Discounts", group: "Discounts" },
  // Notifications
  {
    id: "notifications.view",
    label: "View Notifications",
    group: "NOTIFICATIONS",
  },
  {
    id: "notifications.send",
    label: "Send Notifications",
    group: "NOTIFICATIONS",
  },

  // Teams
  { id: "teams.view", label: "View Teams", group: "TEAMS" },
  { id: "teams.manage", label: "Manage Teams", group: "TEAMS" },

  // Tickets
  { id: "tickets.view", label: "View Tickets", group: "TICKETS" },
  { id: "tickets.manage", label: "Manage Tickets", group: "TICKETS" },
];

export const PERMISSIONS_BY_GROUP = SYSTEM_PERMISSIONS.reduce(
  (acc, curr) => {
    const groupName = curr.group;
    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(curr);
    return acc;
  },
  {} as Record<string, PermissionItem[]>,
);
