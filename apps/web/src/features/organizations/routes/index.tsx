import { lazy } from "react";
import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { PermissionGuard } from "../../auth/components/PermissionGuard";

const OrganizationsPage = lazy(() => import("../pages/OrganizationsPage"));
const OrganizationDetailPage = lazy(() => import("../pages/OrganizationDetailPage"));
const OrgRolesPage = lazy(() => import("../../roles/pages/OrgRolesPage"));

export const organizationsRoutes: RouteObject[] = [
  {
    path: "organizations",
    element: (
      <PermissionGuard
        permissions={[
          "org.view",
          "org.manage_settings",
          "org.manage_members",
          "org.manage_roles",
        ]}
        fallback={<Navigate to="/dashboard" replace />}
      >
        <OrganizationsPage />
      </PermissionGuard>
    ),
  },
  {
    path: "organizations/:orgId",
    element: (
      <PermissionGuard
        permissions={[
          "org.view",
          "org.manage_settings",
          "org.manage_members",
          "org.manage_roles",
        ]}
        fallback={<Navigate to="/dashboard" replace />}
      >
        <OrganizationDetailPage />
      </PermissionGuard>
    ),
  },
  {
    path: "organizations/:orgId/roles",
    element: (
      <PermissionGuard
        permissions={["org.manage_roles", "role.view"]}
        fallback={<Navigate to="/dashboard" replace />}
      >
        <OrgRolesPage />
      </PermissionGuard>
    ),
  },
];
