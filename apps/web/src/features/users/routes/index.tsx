import { lazy } from "react";
import { StaffRoute } from "../../../core/router/StaffRoute";

const UsersListPage = lazy(() => import("../pages/UsersListPage"));

export const usersRoutes = [
  {
    path: "users",
    element: (
      <StaffRoute>
        <UsersListPage />
      </StaffRoute>
    ),
  },
];
