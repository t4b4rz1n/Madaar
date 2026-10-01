import { lazy } from "react";
import { type RouteObject, Navigate } from "react-router-dom";
import { PermissionGuard } from "../../auth/components/PermissionGuard";

const UserFinanceDashboard = lazy(() => import("../pages/UserFinanceDashboard"));
const AdminFinanceDashboard = lazy(() => import("../pages/AdminFinanceDashboard"));

export const financeRoutes: RouteObject[] = [
  {
    path: "finance",
    children: [
      {
        path: "my-reports",
        element: <UserFinanceDashboard />,
      },
      {
        path: "admin",
        element: (
          <PermissionGuard
            permissions={["finance.view_reports", "finance.manage"]}
            fallback={<Navigate to="/dashboard" replace />}
          >
            <AdminFinanceDashboard />
          </PermissionGuard>
        ),
      },
      {
        path: "",
        element: <Navigate to="my-reports" replace />,
      }
    ],
  },
];
