import React from "react";
import { BrowserRouter, useRoutes } from "react-router-dom";
import PageLoader from "../../components/PageLoader";
import { useAuthStore } from "../../features/auth/store/authStore";
import { getRoutes } from "./routes";

const AppRoutes: React.FC = () => {
  const isLoading = useAuthStore((state) => state.isLoading);
  const element = useRoutes(getRoutes());

  if (isLoading) {
    return <PageLoader />;
  }

  return element;
};

export const AppRouter: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  return (
    <BrowserRouter>
      {children}
      <AppRoutes />
    </BrowserRouter>
  );
};

export default AppRouter;
