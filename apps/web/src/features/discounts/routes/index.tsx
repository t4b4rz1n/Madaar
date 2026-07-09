import { lazy } from "react";
import type { RouteObject } from "react-router-dom";

const DiscountsListPage = lazy(() => import("../pages/DiscountsListPage"));

const discountsRoutes: RouteObject[] = [
  {
    path: "/discounts",
    element: <DiscountsListPage />,
  },
];

export default discountsRoutes;
