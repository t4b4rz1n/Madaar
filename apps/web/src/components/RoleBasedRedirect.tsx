import { Navigate } from "react-router-dom";

const RoleBasedRedirect = () => {
  return <Navigate to="/dashboard" replace />;
};

export default RoleBasedRedirect;
