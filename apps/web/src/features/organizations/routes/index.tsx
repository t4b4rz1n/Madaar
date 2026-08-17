import { lazy } from "react";
import type { RouteObject } from "react-router-dom";

const OrganizationsPage = lazy(() => import("../pages/OrganizationsPage"));

export const organizationsRoutes: RouteObject[] = [
  {
    path: "organizations",
    element: <OrganizationsPage />,
  },
];
