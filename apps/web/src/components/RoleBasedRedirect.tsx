import { Navigate } from "react-router-dom";
import { useAuthStore } from "../features/auth/store/authStore";

const RoleBasedRedirect = () => {
  const isStaff = useAuthStore((state) => state.user?.is_staff === true);

  return <Navigate to={isStaff ? "/admin" : "/dashboard"} replace />;
};

export default RoleBasedRedirect;
