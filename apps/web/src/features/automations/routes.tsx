import { lazy } from "react";
import { type RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { PermissionGuard } from "../auth/components/PermissionGuard";

const AutomationsPage = lazy(() =>
  import("./components/AutomationsPage").then((m) => ({
    default: m.AutomationsPage,
  }))
);

export const automationsRoutes: RouteObject[] = [
  {
    path: "automations",
    element: (
      <PermissionGuard
        permissions={["automation.manage", "org.manage_settings"]}
        fallback={<Navigate to="/dashboard" replace />}
      >
        <AutomationsPage />
      </PermissionGuard>
    ),
  },
];
