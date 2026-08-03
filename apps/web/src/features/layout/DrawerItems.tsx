import {
  DiscountShape,
  Notification,
  People,
  Ticket,
  User,
  Category,
  ShieldSecurity,
} from "iconsax-reactjs";

export type DrawerItem = {
  title: string;
  headerTitle?: string;
  link: string;
  icon: React.ReactNode;
  staffOnly?: boolean;
  permission?: string; // اضافه شدن فیلد پرمیشن برای کنترل دسترسی پویا
};

export const drawerItems: DrawerItem[] = [
  {
    title: "Dashboard",
    link: "dashboard",
    icon: <Category variant="Outline" />,
  },
  {
    title: "Roles Management",
    link: "roles",
    icon: <ShieldSecurity size="20" />,
    permission: "roles.manage", // تغییر از staffOnly به کنترل مبتنی بر پرمیشن
  },
  {
    title: "Users Management",
    link: "users",
    icon: <People variant="Outline" />,
    permission: "users.manage", // تغییر به کنترل مبتنی بر پرمیشن
  },
  {
    title: "Discounts",
    link: "discounts",
    icon: <DiscountShape variant="Outline" />,
    permission: "discounts.manage", // تغییر به کنترل مبتنی بر پرمیشن
  },
  {
    title: "Notifications",
    link: "notifications",
    icon: <Notification variant="Outline" />,
    permission: "notifications.view", // اضافه کردن این خط برای کنترل در سایدبار
  },
  {
    title: "Tickets",
    link: "tickets",
    icon: <Ticket variant="Outline" />,
    permission: "tickets.view", // اینم اضافه کن که اصولی بشه (چون سارا تیکت رو داشت)
  },
  {
    title: "Profile",
    link: "profile",
    icon: <User variant="Outline" />,
  },
];
