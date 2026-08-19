import { lazy } from "react";
import { Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import { PermissionGuard } from "../../auth/components/PermissionGuard";

const ProjectsPage = lazy(() => import("../pages/ProjectsPage"));
const ProjectDetailsPage = lazy(() => import("../pages/ProjectDetailsPage"));

export const projectsRoutes: RouteObject[] = [
  {
    path: "projects",
    element: (
      <PermissionGuard
        permissions={["projects.view"]}
        fallback={<Navigate to="/dashboard" replace />}
      >
        <ProjectsPage />
      </PermissionGuard>
    ),
  },
  {
    path: "projects/:id",
    element: (
      <PermissionGuard
        permissions={["projects.view"]}
        fallback={<Navigate to="/projects" replace />}
      >
        <ProjectDetailsPage />
      </PermissionGuard>
    ),
  },
];