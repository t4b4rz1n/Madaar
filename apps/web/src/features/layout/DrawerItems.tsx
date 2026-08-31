import {
  DiscountShape,
  Notification,
  People,
  Ticket,
  User,
  ShieldSecurity,
  Flash,
  Briefcase,
  Profile2User,
  People as TeamsIcon,
  TaskSquare,
  NoteText,
  Chart21,
  Calendar,
  Timer1,
} from "iconsax-reactjs";
import type { ReactNode } from "react";
import type { User as AuthUser } from "../auth/types/authTypes";

export type DrawerItem = {
  title: string;
  headerTitle?: string;
  link: string;
  icon: ReactNode;
  section: "Workspace" | "AdminSettings" | "Support" | "Account";
  staffOnly?: boolean;
  /** Single permission required (AND) */
  permission?: string;
  /** Multiple permissions — user needs ANY ONE of these (OR check) */
  permissions?: string[];
  requiresOrgAdmin?: boolean;
  isPrimary?: boolean;
  /** If true, shown to all authenticated org members regardless of permissions */
  defaultForMembers?: boolean;
};

export const drawerItems: DrawerItem[] = [
  // Primary Workspace Navigation (Main Sidebar)
  {
    title: "Today & Focus",
    link: "dashboard",
    section: "Workspace",
    icon: <Calendar variant="Outline" />,
    defaultForMembers: true,
    isPrimary: true,
  },
  {
    title: "Tasks & Boards",
    link: "tasks",
    section: "Workspace",
    icon: <TaskSquare variant="Outline" />,
    permissions: ["task.view", "board.view", "task.create", "task.manage_all"],
    isPrimary: true,
  },
  {
    title: "Projects",
    link: "projects",
    section: "Workspace",
    icon: <Briefcase variant="Outline" />,
    permissions: ["project.view", "project.create", "project.manage"],
    isPrimary: true,
  },
  {
    title: "Daily Standups",
    link: "standups",
    section: "Workspace",
    icon: <NoteText variant="Outline" />,
    permissions: ["task.view", "task.create", "project.view", "org.manage_settings"],
    isPrimary: true,
  },
  {
    title: "Time & Attendance",
    link: "attendance",
    section: "Workspace",
    icon: <Timer1 variant="Outline" />,
    permissions: ["attendance.view", "attendance.view_all", "leave.approve"],
    isPrimary: true,
  },
  {
    title: "Manager Overview",
    link: "manager",
    section: "Workspace",
    icon: <Chart21 variant="Outline" />,
    permissions: [
      "org.manage_members",
      "attendance.view_all",
      "report.view",
      "finance.view_reports",
    ],
    isPrimary: true,
  },

  // Admin & Settings Navigation (Settings Modal & Command Menu)
  {
    title: "Organizations",
    link: "organizations",
    section: "AdminSettings",
    icon: <Profile2User variant="Outline" />,
    permissions: ["org.manage_settings", "org.manage_members", "org.manage_roles"],
  },
  {
    title: "Users Management",
    link: "users",
    section: "AdminSettings",
    icon: <People variant="Outline" />,
    permissions: ["user.view", "org.manage_members", "org.manage_roles"],
  },
  {
    title: "Teams Management",
    link: "teams",
    section: "AdminSettings",
    icon: <TeamsIcon variant="Outline" />,
    permissions: ["user.view", "org.manage_members", "org.manage_roles"],
  },
  {
    title: "Roles & Permissions",
    link: "roles",
    section: "AdminSettings",
    icon: <ShieldSecurity size="20" />,
    permissions: ["org.manage_roles", "role.view"],
  },
  {
    title: "Automations",
    link: "automations",
    section: "AdminSettings",
    icon: <Flash variant="Outline" />,
    permissions: ["org.manage_settings", "automation.manage"],
  },
  {
    title: "Discounts",
    link: "discounts",
    section: "AdminSettings",
    icon: <DiscountShape variant="Outline" />,
    permissions: ["finance.manage", "finance.view_reports"],
  },

  // Support & System
  {
    title: "Notifications",
    link: "notifications",
    section: "AdminSettings",
    icon: <Notification variant="Outline" />,
    permissions: ["notification.view", "org.manage_settings"],
  },
  {
    title: "Tickets",
    link: "tickets",
    section: "Support",
    icon: <Ticket variant="Outline" />,
    defaultForMembers: true,
  },


  // Account
  {
    title: "Profile Settings",
    link: "profile",
    section: "Account",
    icon: <User variant="Outline" />,
  },
];

export const getVisibleDrawerItems = (
  user: AuthUser | null,
  hasAllPermissions: (permissions: string[]) => boolean,
  hasAnyPermission: (permissions: string[]) => boolean,
  primaryOnly = false
) =>
  drawerItems.filter((item) => {
    if (primaryOnly && !item.isPrimary) return false;
    if (item.staffOnly && !user?.is_staff) return false;
    if (
      item.requiresOrgAdmin &&
      !user?.can_manage_automations &&
      !user?.is_staff &&
      !hasAnyPermission(["org.manage_settings", "core.automations.manage"])
    ) {
      return false;
    }
    if (item.defaultForMembers) return !!user;
    // OR-check: any one of the permissions array is enough
    if (item.permissions?.length && !hasAnyPermission(item.permissions)) return false;
    // AND-check: single legacy permission
    if (item.permission && !hasAllPermissions([item.permission])) return false;
    return true;
  });

export const getAdminDrawerItems = (
  user: AuthUser | null,
  hasAllPermissions: (permissions: string[]) => boolean,
  hasAnyPermission: (permissions: string[]) => boolean
) =>
  drawerItems.filter((item) => {
    if (item.isPrimary) return false;
    if (item.staffOnly && !user?.is_staff) return false;
    if (
      item.requiresOrgAdmin &&
      !user?.can_manage_automations &&
      !user?.is_staff &&
      !hasAnyPermission(["org.manage_settings", "core.automations.manage"])
    ) {
      return false;
    }
    if (item.defaultForMembers) return !!user;
    // OR-check: any one of the permissions array is enough
    if (item.permissions?.length && !hasAnyPermission(item.permissions)) return false;
    // AND-check: single legacy permission
    if (item.permission && !hasAllPermissions([item.permission])) return false;
    return true;
  });
