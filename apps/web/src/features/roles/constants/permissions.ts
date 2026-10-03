import { t } from "../../../i18n/locale";
// apps/web/src/features/roles/constants/permissions.ts

export interface PermissionItem {
  id: string;
  label: string;
  group: string;
}

export const SYSTEM_PERMISSIONS: PermissionItem[] = [
  // Organization & Core
  { id: "org.view", get label() { return t("View Organization"); }, group: "ORGANIZATION" },
  { id: "org.manage_settings", get label() { return t("Manage Org Settings"); }, group: "ORGANIZATION" },
  { id: "org.manage_roles", get label() { return t("Manage Roles & Permissions"); }, group: "ORGANIZATION" },
  { id: "org.manage_members", get label() { return t("Manage Organization Members"); }, group: "ORGANIZATION" },
  { id: "user.view", get label() { return t("View Users"); }, group: "ORGANIZATION" },
  { id: "role.view", get label() { return t("View Roles"); }, group: "ORGANIZATION" },

  // Projects
  { id: "project.view", get label() { return t("View Projects"); }, group: "PROJECTS" },
  { id: "project.create", get label() { return t("ساخت پروژه"); }, group: "PROJECTS" },
  { id: "project.manage", get label() { return t("Manage All Projects"); }, group: "PROJECTS" },

  // Tasks & Boards
  { id: "task.view", get label() { return t("View Tasks"); }, group: "TASKS" },
  { id: "task.create", get label() { return t("Create Task"); }, group: "TASKS" },
  { id: "task.manage_all", get label() { return t("Manage All Tasks"); }, group: "TASKS" },
  { id: "task.review", get label() { return t("Review Tasks"); }, group: "TASKS" },
  { id: "board.view", get label() { return t("View Boards"); }, group: "TASKS" },
  { id: "board.manage", get label() { return t("Manage Boards & Columns"); }, group: "TASKS" },

  // Attendance & Time-off
  { id: "attendance.view_all", get label() { return t("View All Attendances"); }, group: "ATTENDANCE" },
  { id: "leave.approve", get label() { return t("Approve Leave Requests"); }, group: "ATTENDANCE" },

  // Finance & Payroll
  { id: "finance.manage", get label() { return t("Manage Finance & Payroll"); }, group: "FINANCE" },
  { id: "finance.view_reports", get label() { return t("View Financial Reports"); }, group: "FINANCE" },

  // Automations & Notifications
  { id: "notification.view", get label() { return t("View Notifications"); }, group: "AUTOMATIONS" },
  { id: "automation.manage", get label() { return t("Manage Automations"); }, group: "AUTOMATIONS" },

  // Reports
  { id: "report.view", get label() { return t("View Reports & Dashboards"); }, group: "REPORTS" },
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
