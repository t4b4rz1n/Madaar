import { lazy, Suspense } from "react";
import { type RouteObject, Navigate } from "react-router-dom";
import PageLoader from "../../../components/PageLoader";
import { PermissionGuard } from "../../auth/components/PermissionGuard";

const UserFinanceDashboard = lazy(() => import("../pages/UserFinanceDashboard"));
const AdminFinanceDashboard = lazy(() => import("../pages/AdminFinanceDashboard"));

export const financeRoutes: RouteObject[] = [
  {
    path: "finance",
    children: [
      {
        path: "my-reports",
        element: (
          <Suspense fallback={<PageLoader />}>
            <UserFinanceDashboard />
          </Suspense>
        ),
      },
      {
        path: "admin",
        element: (
          <PermissionGuard
            permissions={["finance.view_reports", "finance.manage"]}
            fallback={<Navigate to="/dashboard" replace />}
          >
            <Suspense fallback={<PageLoader />}>
              <AdminFinanceDashboard />
            </Suspense>
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
