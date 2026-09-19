import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../features/auth/store/authStore";
import { usePermissions } from "../../features/auth/hooks/usePermissions";

interface StaffRouteProps {
  children: React.ReactNode;
}

export const StaffRoute = ({ children }: StaffRouteProps) => {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const { hasAnyPermission } = usePermissions();

  // Allow: Django staff/superuser  OR  users with org.manage_settings permission
  const canAccess =
    user?.is_staff === true ||
    hasAnyPermission(["org.manage_settings"]);

  if (canAccess) {
    return children;
  }

  return <Navigate to="/dashboard" replace state={{ from: location }} />;
};
