import { lazy } from "react";
import type { RouteObject } from "react-router-dom";

const TicketsListPage = lazy(() => import("../pages/TicketsListPage"));
const TicketDetailsPage = lazy(() => import("../pages/TicketDetailsPage"));
const TicketTypesListPage = lazy(() => import("../pages/TicketTypesListPage"));

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
    element: <TicketTypesListPage />,
  },
];
