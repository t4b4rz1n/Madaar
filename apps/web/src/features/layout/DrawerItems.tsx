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
    staffOnly: true, // این باعث میشه فقط ادمین‌ها ببینن
  },
  {
    title: "Users Management",
    link: "users",
    icon: <People variant="Outline" />,
    staffOnly: true,
  },
  {
    title: "Discounts",
    link: "discounts",
    icon: <DiscountShape variant="Outline" />,
    staffOnly: true,
  },
  {
    title: "Notifications",
    link: "notifications",
    icon: <Notification variant="Outline" />,
  },
  {
    title: "Tickets",
    link: "tickets",
    icon: <Ticket variant="Outline" />,
  },

  {
    title: "Profile",
    link: "profile",
    icon: <User variant="Outline" />,
  },

];
