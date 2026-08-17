import { Suspense, lazy } from "react";
import { type RouteObject } from "react-router-dom";
import PageLoader from "../../components/PageLoader";
import RoleBasedRedirect from "../../components/RoleBasedRedirect";
import authRoutes from "../../features/auth/routes";
import discountsRoutes from "../../features/discounts/routes";
import { teamsRoutes } from "../../features/teams/routes";
import { projectsRoutes } from "../../features/projects/routes";
import { MainLayout } from "../../features/layout/MainLayout";
import notificationsRoutes from "../../features/notifications/routes";
import profileRoutes from "../../features/profile/routes";
import { usersRoutes } from "../../features/users/routes";
import { ticketsRoutes } from "../../features/tickets/routes";
import { dashboardRoutes } from "../../features/dashboard/routes";
import { rolesRoutes } from "../../features/roles/routes";
import { automationsRoutes } from "../../features/automations/routes";
import { tasksRoutes } from "../../features/tasks/routes";
import { attendanceRoutes } from "../../features/attendance/routes";
import { projectsRoutes } from "../../features/projects/routes";
import { organizationsRoutes } from "../../features/organizations/routes";

const NotFoundPage = lazy(() => import("../../pages/NotFoundPage"));
const SettingsPage = lazy(() => import("../../pages/SettingsPage"));

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
      ...rolesRoutes,
      ...discountsRoutes,
      ...automationsRoutes,
      ...tasksRoutes,
      ...projectsRoutes,
      ...organizationsRoutes,
      ...attendanceRoutes,
      ...teamsRoutes,
      ...projectsRoutes,
      ...discountsRoutes,
      ...notificationsRoutes,
      ...profileRoutes,
      ...ticketsRoutes,
      {
        path: "settings",
        element: <SettingsPage />,
      },
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
