import { lazy } from "react";
import type { RouteObject } from "react-router-dom";
import { StaffRoute } from "../../../core/router/StaffRoute";
import { UserRoute } from "../../../core/router/UserRoute";

const DashboardPage = lazy(() => import("../pages/DashboardPage"));
const ManagerDashboardPage = lazy(() => import("../pages/ManagerDashboardPage"));

export const dashboardRoutes: RouteObject[] = [
  {
    path: "admin",
    element: (
      <StaffRoute>
        <DashboardPage />
      </StaffRoute>
    ),
  },
  {
    path: "dashboard",
    element: (
      <UserRoute>
        <DashboardPage />
      </UserRoute>
    ),
  },
  {
    path: "manager",
    element: <ManagerDashboardPage />,
  },
];
