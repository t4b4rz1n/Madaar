import { lazy } from "react";
import type { RouteObject } from "react-router-dom";

const NotificationsPage = lazy(() => import("../pages/NotificationsPage"));

const notificationsRoutes: RouteObject[] = [
  {
    path: "/notifications",
    element: <NotificationsPage />,
  },
];

export default notificationsRoutes;
