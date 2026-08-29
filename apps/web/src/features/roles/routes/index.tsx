import { Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import { PermissionGuard } from "../../auth/components/PermissionGuard";
import RolesListPage from "../pages/RolesListPage";

export const rolesRoutes: RouteObject[] = [
  {
    path: "roles",
    element: (
      <PermissionGuard
        permissions={["org.manage_roles", "role.view"]}
        fallback={<Navigate to="/dashboard" replace />}
      >
        <RolesListPage />
      </PermissionGuard>
    ),
  },
];
