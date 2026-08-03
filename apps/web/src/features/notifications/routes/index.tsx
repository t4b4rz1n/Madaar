import { lazy } from "react";
import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { PermissionGuard } from "../../auth/components/PermissionGuard";
const NotificationsPage = lazy(() => import("../pages/NotificationsPage"));

const notificationsRoutes: RouteObject[] = [
  {
    path: "/notifications",
    element: (
      <PermissionGuard
        permissions={["notifications.view"]}
        fallback={<Navigate to="/dashboard" replace />}
      >
        <NotificationsPage />
      </PermissionGuard>
    ),
  },
];

export default notificationsRoutes;
