import { Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import { PermissionGuard } from "../../auth/components/PermissionGuard";
import RolesListPage from "../pages/RolesListPage";

export const rolesRoutes: RouteObject[] = [
  {
    path: "roles",
    element: (
      <PermissionGuard
        permissions={["roles.manage"]}
        fallback={<Navigate to="/dashboard" replace />}
      >
        <RolesListPage />
      </PermissionGuard>
    ),
  },
];
