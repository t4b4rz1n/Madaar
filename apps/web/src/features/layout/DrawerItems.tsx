import {
  DiscountShape,
  Notification,
  People,
  Ticket,
  User,
  ShieldSecurity,
  Flash,
  People as TeamsIcon,
  TaskSquare,
  NoteText,
  Chart21,
  Folder2,
  Calendar,
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
  permission?: string;
  requiresOrgAdmin?: boolean;
  isPrimary?: boolean;
};

export const drawerItems: DrawerItem[] = [
  // Primary Workspace Navigation (Shown in main sidebar)
  {
    title: "Today & Focus",
    link: "dashboard",
    section: "Workspace",
    icon: <Calendar variant="Outline" />,
    isPrimary: true,
  },
  {
    title: "Tasks & Boards",
    link: "tasks",
    section: "Workspace",
    icon: <TaskSquare variant="Outline" />,
    isPrimary: true,
  },
  {
    title: "Projects",
    link: "projects",
    section: "Workspace",
    icon: <Folder2 variant="Outline" />,
    isPrimary: true,
  },
  {
    title: "Daily Standups",
    link: "standups",
    section: "Workspace",
    icon: <NoteText variant="Outline" />,
    isPrimary: true,
  },
  {
    title: "Manager Overview",
    link: "manager",
    section: "Workspace",
    icon: <Chart21 variant="Outline" />,
    permission: "teams.view",
    isPrimary: true,
  },

  // Admin & Settings Navigation (Shown in Settings modal & Command Menu)
  {
    title: "Users Management",
    link: "users",
    section: "AdminSettings",
    icon: <People variant="Outline" />,
    permission: "users.view",
  },
  {
    title: "Teams Management",
    link: "teams",
    section: "AdminSettings",
    icon: <TeamsIcon variant="Outline" />,
    permission: "teams.view",
  },
  {
    title: "Roles & Permissions",
    link: "roles",
    section: "AdminSettings",
    icon: <ShieldSecurity size="20" />,
    permission: "roles.manage",
  },
  {
    title: "Automations",
    link: "automations",
    section: "AdminSettings",
    icon: <Flash variant="Outline" />,
    requiresOrgAdmin: true,
  },
  {
    title: "Organizations",
    link: "organizations",
    section: "AdminSettings",
    icon: <People variant="Outline" />,
  },
  {
    title: "Discounts",
    link: "discounts",
    section: "AdminSettings",
    icon: <DiscountShape variant="Outline" />,
    permission: "discounts.manage",
  },
  {
    title: "Notifications",
    link: "notifications",
    section: "Support",
    icon: <Notification variant="Outline" />,
    permission: "notifications.view",
  },
  {
    title: "Tickets",
    link: "tickets",
    section: "Support",
    icon: <Ticket variant="Outline" />,
    permission: "tickets.view",
  },
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
  primaryOnly = false
) =>
  drawerItems.filter((item) => {
    if (primaryOnly && !item.isPrimary) return false;
    if (item.staffOnly && !user?.is_staff) return false;
    if (item.requiresOrgAdmin && !user?.can_manage_automations) return false;
    if (item.permission && !hasAllPermissions([item.permission])) return false;
    return true;
  });

export const getAdminDrawerItems = (
  user: AuthUser | null,
  hasAllPermissions: (permissions: string[]) => boolean
) =>
  drawerItems.filter((item) => {
    if (item.isPrimary) return false;
    if (item.staffOnly && !user?.is_staff) return false;
    if (item.requiresOrgAdmin && !user?.can_manage_automations) return false;
    if (item.permission && !hasAllPermissions([item.permission])) return false;
    return true;
  });
