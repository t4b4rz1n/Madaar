import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../features/auth/store/authStore";

interface UserRouteProps {
  children: React.ReactNode;
}

export const UserRoute = ({ children }: UserRouteProps) => {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);

  if (user?.is_staff !== true) {
    return children;
  }

  return <Navigate to="/admin" replace state={{ from: location }} />;
};
