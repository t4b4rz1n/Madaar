import { lazy } from "react";
import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { PermissionGuard } from "../../auth/components/PermissionGuard";

const TicketsListPage = lazy(() => import("../pages/TicketsListPage"));
const TicketDetailsPage = lazy(() => import("../pages/TicketDetailsPage"));
const TicketTypesListPage = lazy(() => import("../pages/TicketTypesListPage"));

export const ticketsRoutes: RouteObject[] = [
  {
    path: "tickets",
    element: (
      <PermissionGuard
        permissions={["tickets.view"]}
        fallback={<Navigate to="/dashbord" replace />}
      >
        <TicketsListPage />
      </PermissionGuard>
    ),
  },
  {
    path: "tickets/:id",
    element: (
      <PermissionGuard
        permissions={["tickets.view"]}
        fallback={<Navigate to="/dashbord" replace />}
      >
        <TicketDetailsPage />
      </PermissionGuard>
    ),
  },
  {
    path: "ticket-types",
    element: (
      <PermissionGuard
        permissions={["tickets.view"]}
        fallback={<Navigate to="/dashbord" replace />}
      >
        <TicketTypesListPage />
      </PermissionGuard>
    ),
  },
];
