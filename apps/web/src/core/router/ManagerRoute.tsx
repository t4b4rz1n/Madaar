import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../features/auth/store/authStore";

interface ManagerRouteProps {
  children: React.ReactNode;
}

/**
 *
 *
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
