import { type RouteObject } from "react-router-dom";
import { AutomationsPage } from "./components/AutomationsPage";
import { StaffRoute } from "../../core/router/StaffRoute";

export const automationsRoutes: RouteObject[] = [
  {
    path: "automations",
    element: (
      <StaffRoute>
        <AutomationsPage />
      </StaffRoute>
    ),
  },
];
