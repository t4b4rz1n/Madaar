import {
  DiscountShape,
  Notification,
  People,
  Ticket,
  User,
  Category,
  ShieldSecurity,
  Flash,
  Briefcase, // اضافه شدن آیکون پروژه‌ها 
  Profile2User,
} from "iconsax-reactjs";

export type DrawerItem = {
  title: string;
  headerTitle?: string;
  link: string;
  icon: React.ReactNode;
  staffOnly?: boolean;
  permission?: string;
  requiresOrgAdmin?: boolean;
};

export const drawerItems: DrawerItem[] = [
  {
    title: "Dashboard",
    link: "dashboard",
    icon: <Category variant="Outline" />,
  },
  {
    title: "Automations",
    link: "automations",
    icon: <Flash variant="Outline" />,
    requiresOrgAdmin: true,
  },
  {
    title: "Roles Management",
    link: "roles",
    icon: <ShieldSecurity size="20" />,
    permission: "roles.manage",
  },
  {
    title: "Users Management",
    link: "users",
    icon: <People variant="Outline" />,
    permission: "users.view",
  },
  {
    title: "Teams Management",
    link: "teams",
    icon: <Profile2User variant="Outline" />,
    permission: "teams.view",
  },
  {
    title: "Projects", // بخش جدید پروژه‌ها
    link: "projects",
    icon: <Briefcase variant="Outline" />,
    permission: "projects.view",
  },
  {
    title: "Discounts",
    link: "discounts",
    icon: <DiscountShape variant="Outline" />,
    permission: "discounts.manage",
  },
  {
    title: "Notifications",
    link: "notifications",
    icon: <Notification variant="Outline" />,
    permission: "notifications.view",
  },
  {
    title: "Tickets",
    link: "tickets",
    icon: <Ticket variant="Outline" />,
    permission: "tickets.view",
  },
  {
    title: "Profile",
    link: "profile",
    icon: <User variant="Outline" />,
  },
];
