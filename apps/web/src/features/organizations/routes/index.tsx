import { lazy } from "react";
import type { RouteObject } from "react-router-dom";

const OrganizationsPage = lazy(() => import("../pages/OrganizationsPage"));
const OrganizationDetailPage = lazy(() => import("../pages/OrganizationDetailPage"));

export const organizationsRoutes: RouteObject[] = [
  {
    path: "organizations",
    element: <OrganizationsPage />,
  },
  {
    path: "organizations/:orgId",
    element: <OrganizationDetailPage />,
  },
];
