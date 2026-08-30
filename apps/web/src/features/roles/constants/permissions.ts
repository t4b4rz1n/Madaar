// apps/web/src/features/roles/constants/permissions.ts

export interface PermissionItem {
  id: string;
  label: string;
  group: string;
}

export const SYSTEM_PERMISSIONS: PermissionItem[] = [
  // Organization & Core
  { id: "org.view", label: "View Organization", group: "ORGANIZATION" },
  { id: "org.manage_settings", label: "Manage Org Settings", group: "ORGANIZATION" },
  { id: "org.manage_roles", label: "Manage Roles & Permissions", group: "ORGANIZATION" },
  { id: "org.manage_members", label: "Manage Organization Members", group: "ORGANIZATION" },
  { id: "user.view", label: "View Users", group: "ORGANIZATION" },
  { id: "role.view", label: "View Roles", group: "ORGANIZATION" },

  // Projects
  { id: "project.view", label: "View Projects", group: "PROJECTS" },
  { id: "project.create", label: "Create Project", group: "PROJECTS" },
  { id: "project.manage", label: "Manage All Projects", group: "PROJECTS" },

  // Tasks & Boards
  { id: "task.view", label: "View Tasks", group: "TASKS" },
  { id: "task.create", label: "Create Task", group: "TASKS" },
  { id: "task.manage_all", label: "Manage All Tasks", group: "TASKS" },
  { id: "task.review", label: "Review Tasks", group: "TASKS" },
  { id: "board.view", label: "View Boards", group: "TASKS" },
  { id: "board.manage", label: "Manage Boards & Columns", group: "TASKS" },

  // Attendance & Time-off
  { id: "attendance.view", label: "View Personal Attendance", group: "ATTENDANCE" },
  { id: "attendance.view_all", label: "View All Attendances", group: "ATTENDANCE" },
  { id: "leave.approve", label: "Approve Leave Requests", group: "ATTENDANCE" },

  // Finance & Payroll
  { id: "finance.manage", label: "Manage Finance & Payroll", group: "FINANCE" },
  { id: "finance.view_reports", label: "View Financial Reports", group: "FINANCE" },

  // Automations & Notifications
  { id: "notification.view", label: "View Notifications", group: "AUTOMATIONS" },
  { id: "automation.manage", label: "Manage Automations", group: "AUTOMATIONS" },

  // Reports
  { id: "report.view", label: "View Reports & Dashboards", group: "REPORTS" },
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
