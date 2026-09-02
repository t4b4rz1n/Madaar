import { lazy, Suspense } from "react";
import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { PermissionGuard } from "../../auth/components/PermissionGuard";
import PageLoader from "../../../components/PageLoader";

const DashboardPage = lazy(() => import("../pages/DashboardPage"));
const UserDashboardPage = lazy(() => import("../pages/UserDashboardPage"));
const ManagerDashboardPage = lazy(() => import("../pages/ManagerDashboardPage"));
const TeamLeadDashboardPage = lazy(() => import("../pages/TeamLeadDashboardPage"));

export const dashboardRoutes: RouteObject[] = [
  {
    // صفحه داشبورد ادمین: نیاز به پرمیشن مدیریت کلی سازمان
    path: "admin",
    element: (
      <Suspense fallback={<PageLoader />}>
        <PermissionGuard
          permissions={["org.manage_settings"]}
          fallback={<Navigate to="/dashboard" replace />}
        >
          <DashboardPage />
        </PermissionGuard>
      </Suspense>
    ),
  },
  {
    // داشبورد شخصی: همه کاربران لاگین‌شده
    path: "dashboard",
    element: (
      <Suspense fallback={<PageLoader />}>
        <UserDashboardPage />
      </Suspense>
    ),
  },
  {
    // صفحه مدیریت: نیاز به یکی از پرمیشن‌های مدیریتی
    path: "manager",
    element: (
      <Suspense fallback={<PageLoader />}>
        <PermissionGuard
          permissions={[
            "report.view",
            "attendance.view_all",
            "org.manage_members",
            "finance.view_reports",
            "org.manage_settings",
          ]}
          fallback={<Navigate to="/dashboard" replace />}
        >
          <ManagerDashboardPage />
        </PermissionGuard>
      </Suspense>
    ),
  },
  {
    // داشبورد تیم‌لید: نیاز به دسترسی گزارش یا مدیریت اعضا
    // خطای 403 توسط صفحه خودش handle می‌شود
    path: "team-lead",
    element: (
      <Suspense fallback={<PageLoader />}>
        <PermissionGuard
          permissions={[
            "report.view",
            "attendance.view_all",
            "org.manage_members",
          ]}
          fallback={<Navigate to="/dashboard" replace />}
        >
          <TeamLeadDashboardPage />
        </PermissionGuard>
      </Suspense>
    ),
  },
];
