import { Navigate } from "react-router-dom";
import { useAuthStore } from "../features/auth/store/authStore";

const RoleBasedRedirect = () => {
  const role = useAuthStore((state) => state.user?.role);

  return <Navigate to={role === "admin" ? "/admin" : "/dashboard"} replace />;
};

export default RoleBasedRedirect;
