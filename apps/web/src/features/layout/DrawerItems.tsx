import {
  DiscountShape,
  Message,
  Notification,
  People,
  Ticket,
  User,
  Category,
} from "iconsax-reactjs";

export type DrawerItem = {
  title: string;
  headerTitle?: string;
  link: string;
  icon: React.ReactNode;
};

export const drawerItems: DrawerItem[] = [
  {
    title: "Dashboard",
    link: "dashboard",
    icon: <Category variant="Outline" />,
  },
  {
    title: "Users Management",
    link: "users",
    icon: <People variant="Outline" />,
  },
  {
    title: "Discounts",
    link: "discounts",
    icon: <DiscountShape variant="Outline" />,
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
    title: "Feedback",
    link: "feedbacks",
    icon: <Message variant="Outline" />,
  },
  {
    title: "Profile",
    link: "profile",
    icon: <User variant="Outline" />,
  },
];
