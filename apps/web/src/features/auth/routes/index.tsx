import { lazy } from "react";
import type { RouteObject } from "react-router-dom";

const LoginPage = lazy(() => import("../pages/LoginPage"));
const RegisterPage = lazy(() => import("../pages/RegisterPage"));

export const authRoutes: RouteObject[] = [
  {
    path: "login",
    element: <LoginPage />,
  },
  {
    path: "register",
    element: <RegisterPage />,
  },
];

export default authRoutes;
