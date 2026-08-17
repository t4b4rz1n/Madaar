import {
  DiscountShape,
  Notification,
  People,
  Ticket,
  User,
  Category,
  ShieldSecurity,
  Flash,
  People as TeamsIcon,
  TaskSquare,
  NoteText,
  Chart21,
  Folder2,
} from "iconsax-reactjs";
import type { ReactNode } from "react";
import type { User as AuthUser } from "../auth/types/authTypes";

export type DrawerItem = {
  title: string;
  headerTitle?: string;
  link: string;
  icon: ReactNode;
  section: "Workspace" | "Organization" | "Administration" | "Support" | "Account";
  staffOnly?: boolean;
  permission?: string;
  requiresOrgAdmin?: boolean;
};

export const drawerItems: DrawerItem[] = [
  {
    title: "Dashboard",
    link: "dashboard",
    section: "Workspace",
    icon: <Category variant="Outline" />,
  },
  {
    title: "Tasks",
    link: "tasks",
    section: "Workspace",
    icon: <TaskSquare variant="Outline" />,
  },
  {
    title: "Projects",
    link: "projects",
    section: "Workspace",
    icon: <Folder2 variant="Outline" />,
  },
  {
    title: "Manager overview",
    link: "manager",
    section: "Workspace",
    icon: <Chart21 variant="Outline" />,
    permission: "teams.view",
  },
  {
    title: "Automations",
    link: "automations",
    section: "Administration",
    icon: <Flash variant="Outline" />,
    requiresOrgAdmin: true,
  },
  {
    title: "Roles Management",
    link: "roles",
    section: "Administration",
    icon: <ShieldSecurity size="20" />,
    permission: "roles.manage", // تغییر از staffOnly به کنترل مبتنی بر پرمیشن
  },
  {
    title: "Users Management",
    link: "users",
    section: "Administration",
    icon: <People variant="Outline" />,
    permission: "users.view", // تغییر به کنترل مبتنی بر پرمیشن
  },
  {
    title: "Discounts",
    link: "discounts",
    section: "Administration",
    icon: <DiscountShape variant="Outline" />,
    permission: "discounts.manage", // تغییر به کنترل مبتنی بر پرمیشن
  },
  {
    title: "Notifications",
    link: "notifications",
    section: "Support",
    icon: <Notification variant="Outline" />,
    permission: "notifications.view", // اضافه کردن این خط برای کنترل در سایدبار
  },
  {
    title: "Tickets",
    link: "tickets",
    section: "Support",
    icon: <Ticket variant="Outline" />,
    permission: "tickets.view", // اینم اضافه کن که اصولی بشه (چون سارا تیکت رو داشت)
  },
  {
    title: "Profile",
    link: "profile",
    section: "Account",
    icon: <User variant="Outline" />,
  },
  {
    title: "Teams Management",
    link: "teams",
    section: "Organization",
    icon: <TeamsIcon variant="Outline" />,
    permission: "teams.view",
  },
  {
    title: "Daily Standups",
    link: "standups",
    section: "Workspace",
    icon: <NoteText variant="Outline" />,
  },
];

export const getVisibleDrawerItems = (
  user: AuthUser | null,
  hasAllPermissions: (permissions: string[]) => boolean,
) =>
  drawerItems.filter((item) => {
    if (item.staffOnly && !user?.is_staff) return false;
    if (item.requiresOrgAdmin && !user?.can_manage_automations) return false;
    if (item.permission && !hasAllPermissions([item.permission])) return false;
    return true;
  });
