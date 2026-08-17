import { lazy } from "react";
import { Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import { PermissionGuard } from "../../auth/components/PermissionGuard";

// 💡 اصلاح Import به ProjectsPage اصلی
const ProjectsPage = lazy(() => import("../pages/ProjectsPage"));
const ProjectDetailsPage = lazy(() => import("../pages/ProjectDetailsPage"));

export const projectsRoutes: RouteObject[] = [
  {
    path: "projects",
    children: [
      {
        index: true,
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
        path: ":id",
        element: (
          <PermissionGuard
            permissions={["projects.view"]}
            fallback={<Navigate to="/projects" replace />}
          >
            <ProjectDetailsPage />
          </PermissionGuard>
        ),
      },
    ],
  },
];
