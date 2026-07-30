// @apps/web/src/features/roles/constants/permissions.ts

export interface PermissionItem {
  id: string;
  label: string;
  group: string;
}

export const SYSTEM_PERMISSIONS: PermissionItem[] = [
  // Users module
  { id: "users.view", label: "View Users", group: "Users" },
  { id: "users.create", label: "Create User", group: "Users" },
  { id: "users.edit", label: "Edit User", group: "Users" },
  { id: "users.delete", label: "Delete User", group: "Users" },

  // Roles module
  { id: "roles.view", label: "View Roles", group: "Roles" },
  { id: "roles.create", label: "Create Role", group: "Roles" },
  { id: "roles.edit", label: "Edit Role", group: "Roles" },
  { id: "roles.delete", label: "Delete Role", group: "Roles" },

  // Teams module
  { id: "teams.view", label: "View Teams", group: "Teams" },
  { id: "teams.manage", label: "Manage Teams", group: "Teams" },

  // Tickets module
  { id: "tickets.view", label: "View Tickets", group: "Tickets" },
  { id: "tickets.manage", label: "Manage Tickets", group: "Tickets" },
];

// For easier access by groups in UI
export const PERMISSIONS_BY_GROUP = SYSTEM_PERMISSIONS.reduce((acc, curr) => {
  if (!acc[curr.group]) acc[curr.group] = [];
  acc[curr.group].push(curr);
  return acc;
}, {} as Record<string, PermissionItem[]>);