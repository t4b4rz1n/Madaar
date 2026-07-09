import { lazy } from "react";
import type { RouteObject } from "react-router-dom";
import { StaffRoute } from "../../../core/router/StaffRoute";

const DiscountsListPage = lazy(() => import("../pages/DiscountsListPage"));

const discountsRoutes: RouteObject[] = [
  {
    path: "/discounts",
    element: (
      <StaffRoute>
        <DiscountsListPage />
      </StaffRoute>
    ),
  },
];

export default discountsRoutes;
