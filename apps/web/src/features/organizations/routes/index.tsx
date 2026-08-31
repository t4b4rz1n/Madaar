import { lazy, Suspense } from "react";
import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { PermissionGuard } from "../../auth/components/PermissionGuard";
import PageLoader from "../../../components/PageLoader";

const OrganizationsPage = lazy(() => import("../pages/OrganizationsPage"));

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
];
