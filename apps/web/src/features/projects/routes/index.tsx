import { lazy, Suspense } from "react";
import { Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import { PermissionGuard } from "../../auth/components/PermissionGuard";
import PageLoader from "../../../components/PageLoader";

const ProjectsPage = lazy(() => import("../pages/ProjectsPage"));
const ProjectDetailsPage = lazy(() => import("../pages/ProjectDetailsPage"));

export const projectsRoutes: RouteObject[] = [
  {
    path: "projects",
    element: (
      <PermissionGuard
        permissions={["project.view", "project.create", "project.manage"]}
        fallback={<Navigate to="/dashboard" replace />}
      >
        <Suspense fallback={<PageLoader />}>
          <ProjectsPage />
        </Suspense>
      </PermissionGuard>
    ),
  },
  {
    path: "projects/:id",
    element: (
      <PermissionGuard
        permissions={["project.view", "project.create", "project.manage"]}
        fallback={<Navigate to="/projects" replace />}
      >
        <Suspense fallback={<PageLoader />}>
          <ProjectDetailsPage />
        </Suspense>
      </PermissionGuard>
    ),
  },
];
