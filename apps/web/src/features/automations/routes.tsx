import { type RouteObject } from "react-router-dom";
import { AutomationsPage } from "./components/AutomationsPage";

export const automationsRoutes: RouteObject[] = [
  {
    path: "automations",
    element: <AutomationsPage />,
  },
];
