import { lazy } from "react";
import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { PermissionGuard } from "../../auth/components/PermissionGuard";

const DashboardPage = lazy(() => import("../pages/DashboardPage"));
const UserDashboardPage = lazy(() => import("../pages/UserDashboardPage"));
const ManagerDashboardPage = lazy(() => import("../pages/ManagerDashboardPage"));
const TeamLeadDashboardPage = lazy(() => import("../pages/TeamLeadDashboardPage"));

export const dashboardRoutes: RouteObject[] = [
  {
    path: "admin",
    element: (
      <PermissionGuard
        permissions={["org.manage_settings"]}
        fallback={<Navigate to="/dashboard" replace />}
      >
        <DashboardPage />
      </PermissionGuard>
    ),
  },
  {
    path: "dashboard",
    element: <UserDashboardPage />,
  },
  {
    path: "manager",
    element: (
      <PermissionGuard
        permissions={[
          "report.view",
          "attendance.view_all",
          "org.manage_members",
          "finance.view_reports",
          "org.manage_settings",
        ]}
        fallback={<Navigate to="/dashboard" replace />}
      >
        <ManagerDashboardPage />
      </PermissionGuard>
    ),
  },
  {
    path: "team-lead",
    element: (
      <PermissionGuard
        permissions={[
          "report.view_team_lead",
          "report.view",
          "attendance.view_all",
          "org.manage_members",
        ]}
        fallback={<Navigate to="/dashboard" replace />}
      >
        <TeamLeadDashboardPage />
      </PermissionGuard>
    ),
  },
];
