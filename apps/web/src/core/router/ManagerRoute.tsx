import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../features/auth/store/authStore";

interface ManagerRouteProps {
  children: React.ReactNode;
}

/**
 * ManagerRoute — Route Guard برای داشبورد‌های مدیریتی (مدیر / تیم‌لید)
 *
 * این Guard فقط احراز هویت را بررسی می‌کند (isAuthenticated).
 * کنترل دسترسی نقش (team_lead / manager) کاملاً توسط بکاند انجام می‌شود؛
 * پاسخ 403 در Error State صفحه مدیریت می‌شود.
 *
 * ⚠️ بدهی فنی: OrganizationMembership.role در پاسخ Auth فرانت وجود ندارد،
 * بنابراین امکان Guard دقیق نقش در لایه فرانت وجود ندارد.
 * این باید توسط تیم بکاند در serializer لاگین اضافه شود.
 */
export const ManagerRoute = ({ children }: ManagerRouteProps) => {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuthStore((state) => ({
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
  }));

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};
