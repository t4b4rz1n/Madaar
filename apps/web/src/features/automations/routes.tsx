import { Suspense } from "react";
import { type RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { PermissionGuard } from "../auth/components/PermissionGuard";
import PageLoader from "../../components/PageLoader";
import { AutomationsPage } from "./components/AutomationsPage";

export const automationsRoutes: RouteObject[] = [
  {
    path: "automations",
    element: (
      <Suspense fallback={<PageLoader />}>
        <PermissionGuard
          permissions={["automation.manage", "org.manage_settings"]}
          fallback={<Navigate to="/dashboard" replace />}
        >
          <AutomationsPage />
        </PermissionGuard>
      </Suspense>
    ),
  },
];
