import { lazy } from "react";
import type { RouteObject } from "react-router-dom";

const LoginPage = lazy(() => import("../pages/LoginPage"));

export const authRoutes: RouteObject[] = [
  {
    path: "login",
    element: <LoginPage />,
  },
];

export default authRoutes;
