import { Suspense, lazy } from "react";
import { type RouteObject } from "react-router-dom";
import PageLoader from "../../components/PageLoader";
import RoleBasedRedirect from "../../components/RoleBasedRedirect";
import authRoutes from "../../features/auth/routes";
import discountsRoutes from "../../features/discounts/routes";

import { MainLayout } from "../../features/layout/MainLayout";
import notificationsRoutes from "../../features/notifications/routes";
import profileRoutes from "../../features/profile/routes";
import { usersRoutes } from "../../features/users/routes";
import { ticketsRoutes } from "../../features/tickets/routes";
import { dashboardRoutes } from "../../features/dashboard/routes";

const NotFoundPage = lazy(() => import("../../pages/NotFoundPage"));

export const routes: RouteObject[] = [
  ...authRoutes,
  {
    path: "/",
    element: (
      <Suspense fallback={<PageLoader />}>
        <MainLayout />
      </Suspense>
    ),
    children: [
      {
        index: true,
        element: <RoleBasedRedirect />,
      },
      ...dashboardRoutes,
      ...usersRoutes,
      ...discountsRoutes,

      ...notificationsRoutes,
      ...profileRoutes,
      ...ticketsRoutes,
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
];

export const getRoutes = (): RouteObject[] => {
  return routes;
};
