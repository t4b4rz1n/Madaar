import { lazy } from "react";
import { Navigate } from "react-router-dom";
import { PermissionGuard } from "../../auth/components/PermissionGuard";

const TeamsListPage = lazy(() => import("../pages/TeamsListPage"));

export const teamsRoutes = [
  {
    path: "teams",
    element: (
      <PermissionGuard
        permissions={["teams.view"]}
        fallback={<Navigate to="/dashboard" replace />}
      >
        <TeamsListPage />
      </PermissionGuard>
    ),
  },
];
