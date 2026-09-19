import type { RouteObject } from "react-router-dom";
import { GamificationDashboard } from "../pages/GamificationDashboard";
import { GamificationAdminPanel } from "../pages/GamificationAdminPanel";
import { StaffRoute } from "../../../core/router/StaffRoute";

export const gamificationRoutes: RouteObject[] = [
  {
    path: "",
    element: <GamificationDashboard />,
  },
  {
    path: "admin",
    element: (
      <StaffRoute>
        <GamificationAdminPanel />
      </StaffRoute>
    ),
  },
];
