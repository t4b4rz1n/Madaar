import type { RouteObject } from "react-router-dom";
import RolesListPage from "../pages/RolesListPage";

export const rolesRoutes: RouteObject[] = [
  {
    path: "roles",
    element: <RolesListPage />,
  },
];
