import { lazy } from "react";
import { Navigate } from "react-router-dom";
import { PermissionGuard } from "../../auth/components/PermissionGuard";

const UsersListPage = lazy(() => import("../pages/UsersListPage"));

export const usersRoutes = [
  {
    path: "users",
    element: (
      <PermissionGuard
        permissions={["user.view", "org.manage_members"]}
        fallback={<Navigate to="/dashboard" replace />}
      >
        <UsersListPage />
      </PermissionGuard>
    ),
  },
];
