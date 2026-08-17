import { lazy } from "react";
import type { RouteObject } from "react-router-dom";

const ProjectsPage = lazy(() => import("../pages/ProjectsPage"));

export const projectsRoutes: RouteObject[] = [
  {
    path: "projects",
    element: <ProjectsPage />,
  },
];
