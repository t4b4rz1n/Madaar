import { lazy } from "react";
import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { PermissionGuard } from "../../auth/components/PermissionGuard";

const DiscountsListPage = lazy(() => import("../pages/DiscountsListPage"));

const discountsRoutes: RouteObject[] = [
  {
    path: "/discounts",
    element: (
      <PermissionGuard
        permissions={["finance.manage", "org.manage_settings"]}
        fallback={<Navigate to="/dashboard" replace />}
      >
        <DiscountsListPage />
      </PermissionGuard>
    ),
  },
];

export default discountsRoutes;
