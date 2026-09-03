import { lazy, Suspense } from "react";
import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { PermissionGuard } from "../../auth/components/PermissionGuard";
import PageLoader from "../../../components/PageLoader";

const OrganizationsPage = lazy(() => import("../pages/OrganizationsPage"));
const OrganizationDetailPage = lazy(() => import("../pages/OrganizationDetailPage"));
const OrgRolesPage = lazy(() => import("../../roles/pages/OrgRolesPage"));

export const organizationsRoutes: RouteObject[] = [
  {
    // صفحه سازمان‌ها: نیاز به یکی از پرمیشن‌های مدیریت سازمان
    path: "organizations",
    element: (
      <Suspense fallback={<PageLoader />}>
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
      </Suspense>
    ),
  },
  {
    path: "organizations/:orgId",
    element: (
      <Suspense fallback={<PageLoader />}>
        <OrganizationDetailPage />
      </Suspense>
    ),
  },
  {
    // صفحه مدیریت رول‌های سازمان - org-scoped roles
    path: "organizations/:orgId/roles",
    element: (
      <Suspense fallback={<PageLoader />}>
        <PermissionGuard
          permissions={["org.manage_roles", "role.view"]}
          fallback={<Navigate to="/dashboard" replace />}
        >
          <OrgRolesPage />
        </PermissionGuard>
      </Suspense>
    ),
  },
];
