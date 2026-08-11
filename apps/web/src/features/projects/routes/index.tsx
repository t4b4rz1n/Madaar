import { lazy } from "react";
import { Navigate } from "react-router-dom";
import { PermissionGuard } from "../../auth/components/PermissionGuard";

const ProjectsListPage = lazy(() => import("../pages/ProjectsListPage"));

export const projectsRoutes = [
  {
    path: "projects",
    element: (
      <PermissionGuard
        permissions={["projects.view"]}
        fallback={<Navigate to="/dashboard" replace />}
      >
        <ProjectsListPage />
      </PermissionGuard>
    ),
  },
  // بعداً روت‌های دیگه مثل جزئیات پروژه رو همینجا اضافه می‌کنیم:
  // {
  //   path: "projects/:id",
  //   element: (
  //     <PermissionGuard permissions={["projects.view"]}>
  //       <ProjectDetailsPage />
  //     </PermissionGuard>
  //   ),
  // },
];