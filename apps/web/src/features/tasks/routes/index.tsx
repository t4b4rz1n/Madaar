import { lazy } from "react";
import type { RouteObject } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import { PermissionGuard } from '../../auth/components/PermissionGuard';
import { UserRoute } from '../../../core/router/UserRoute';

const TaskManagementPage = lazy(() =>
  import('../pages/TaskManagementPage').then((m) => ({
    default: m.TaskManagementPage,
  }))
);

const StandupsPage = lazy(() =>
  import('../pages/StandupsPage').then((m) => ({
    default: m.StandupsPage,
  }))
);

export const tasksRoutes: RouteObject[] = [
  {
    path: 'tasks',
    element: (
      <PermissionGuard
        permissions={['task.view', 'board.view', 'task.create', 'task.manage_all']}
        fallback={<Navigate to="/dashboard" replace />}
      >
        <TaskManagementPage />
      </PermissionGuard>
    ),
  },
  {
    path: 'standups',
    element: (
      <UserRoute>
        <PermissionGuard
          permissions={['org.manage_settings', 'report.view']}
          fallback={<Navigate to="/dashboard" replace />}
        >
          <StandupsPage />
        </PermissionGuard>
      </UserRoute>
    ),
  },
];
