import { lazy } from "react";
import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { PermissionGuard } from "../../auth/components/PermissionGuard";

const TicketsListPage = lazy(() => import("../pages/TicketsListPage"));
const TicketDetailsPage = lazy(() => import("../pages/TicketDetailsPage"));
const TicketTypesListPage = lazy(() => import("../pages/TicketTypesListPage"));

// All authenticated org members can access their own tickets
// tickets.view OR defaultForMembers — no hard permission block at route level
export const ticketsRoutes: RouteObject[] = [
  {
    path: "tickets",
    element: <TicketsListPage />,
  },
  {
    path: "tickets/:id",
    element: <TicketDetailsPage />,
  },
  {
    path: "ticket-types",
    element: (
      <PermissionGuard
        permissions={["org.manage_settings"]}
        fallback={<Navigate to="/dashboard" replace />}
      >
        <TicketTypesListPage />
      </PermissionGuard>
    ),
  },
];
