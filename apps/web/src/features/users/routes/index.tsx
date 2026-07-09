import { lazy } from "react";

const UsersListPage = lazy(() => import("../pages/UsersListPage"));

export const usersRoutes = [
  {
    path: "users",
    element: <UsersListPage />,
  },
];
